/**
 * OpenAI 翻译服务
 * 使用 GPT-4o-mini 进行翻译
 */

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Language, LANGUAGE_MAP } from '@/models/language'
import { BATCH_PROMPT_TEMPLATE, SINGLE_PROMPT_TEMPLATE, renderPromptTemplate } from '@/models/ai'

/**
 * 翻译请求
 */
export interface TranslateRequest {
  text: string // 要翻译的文本
  targetLanguage: Language // 目标语言
  sourceLanguage?: Language // 源语言（默认为英语）
  context?: string // 上下文信息（如资源名）
}

/**
 * 翻译响应
 */
export interface TranslateResponse {
  originalText: string // 原文
  translatedText: string // 译文
  targetLanguage: Language // 目标语言
}

/**
 * 批量翻译请求
 */
export interface BatchTranslateRequest {
  items: Array<{
    key: string // 唯一标识
    text: string | string[] // 要翻译的文本（支持字符串或字符串数组）
    context?: string // 上下文信息
  }>
  targetLanguage: Language // 目标语言
  sourceLanguage?: Language // 源语言
}

/**
 * 批量翻译响应
 */
export interface BatchTranslateResponse {
  results: Map<string, string | string[]> // key -> translated text or array
  errors: Map<string, string> // key -> error message
}

/**
 * 翻译进度回调
 */
export type ProgressCallback = (current: number, total: number) => void

/**
 * 取消检查回调
 */
export type CancellationCallback = () => boolean

/**
 * OpenAI 翻译配置
 */
export interface OpenAIConfig {
  apiUrl: string // API URL
  apiToken: string // API Key
  model?: string // 模型名称（默认 gpt-4o-mini）
  httpProxy?: string // HTTP 代理
  maxRetries?: number // 最大重试次数
  timeout?: number // 超时时间（毫秒）
  temperature?: number // 温度参数（0-1）
  promptExtra?: string // 额外提示词
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
  model: 'gpt-4o-mini',
  maxRetries: 3,
  timeout: 30000, // 保持30秒超时，给AI足够时间
  temperature: 0.3, // 较低的温度以获得更一致的翻译
}

/**
 * OpenAI 翻译服务
 */
export class OpenAITranslator {
  private config: OpenAIConfig
  private client: AxiosInstance
  private abortController: AbortController | null = null
  private requestStartTime: number | null = null // 记录请求开始时间

  constructor(config: OpenAIConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.client = this.createClient()
  }

  /**
   * 创建 axios 客户端
   */
  private createClient(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiToken}`,
      },
    }

    // 配置代理（如果有）
    if (this.config.httpProxy) {
      // 注意：浏览器环境不支持代理，只在 Tauri 中生效
      axiosConfig.proxy = false
      // 在 Tauri 环境中，需要通过系统代理设置
    }

    return axios.create(axiosConfig)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...config }
    this.client = this.createClient()
  }

  /**
   * 创建新的取消信号
   */
  createCancelToken(): AbortController {
    // 如果之前有未取消的请求，先取消
    if (this.abortController && !this.abortController.signal.aborted) {
      try {
        this.abortController.abort('New translation started')
      } catch (e) {
        // 忽略重复取消的错误
      }
    }
    this.abortController = new AbortController()
    return this.abortController
  }

  /**
   * 取消当前翻译请求
   */
  cancel(reason?: string): void {
    if (!this.abortController) return

    // 记录请求已进行的时间（仅用于日志）
    const elapsed = this.requestStartTime ? Date.now() - this.requestStartTime : 0
    console.log(`Cancelling translation after ${elapsed}ms`)

    try {
      this.abortController.abort(reason || 'Translation cancelled by user')
    } catch (e) {
      // 忽略重复取消的错误
    } finally {
      this.abortController = null
    }
  }

  /**
   * 强制设置当前请求的超时时间
   */
  setTimeout(timeout: number): void {
    // 更新客户端的超时配置
    this.client.defaults.timeout = timeout
  }

  /**
   * 获取请求开始时间（用于调试）
   */
  getRequestElapsed(): number {
    if (!this.requestStartTime) return 0
    return Date.now() - this.requestStartTime
  }

  /**
   * 翻译单个文本
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const { text, targetLanguage, sourceLanguage = Language.DEF, context } = request

    const targetLangInfo = LANGUAGE_MAP[targetLanguage]
    const sourceLangInfo = LANGUAGE_MAP[sourceLanguage]

    if (!targetLangInfo) {
      throw new Error(`Unsupported target language: ${targetLanguage}`)
    }

    // 构建提示词
    const prompt = this.buildPrompt(
      text,
      sourceLangInfo?.nameEn || 'English',
      targetLangInfo.nameEn,
      context
    )

    // 调用 OpenAI API
    const translatedText = await this.callOpenAI(prompt)

    return {
      originalText: text,
      translatedText,
      targetLanguage,
    }
  }

  /**
   * 批量翻译
   */
  async batchTranslate(
    request: BatchTranslateRequest,
    onProgress?: ProgressCallback,
    checkCancellation?: CancellationCallback
  ): Promise<BatchTranslateResponse> {
    const { items, targetLanguage, sourceLanguage = Language.DEF } = request
    const results = new Map<string, string | string[]>()
    const errors = new Map<string, string>()

    const total = items.length
    let current = 0

    for (const item of items) {
      // 检查是否取消
      if (checkCancellation && checkCancellation()) {
        throw new Error('Translation cancelled')
      }

      try {
        if (typeof item.text === 'string') {
          // 单个字符串翻译
          const response = await this.translate({
            text: item.text,
            targetLanguage,
            sourceLanguage,
            context: item.context,
          })
          results.set(item.key, response.translatedText)
        } else {
          // 字符串数组翻译
          const translatedArray = await this.translateArray(
            item.text,
            item.key,
            targetLanguage,
            sourceLanguage
          )
          results.set(item.key, translatedArray)
        }
      } catch (error: any) {
        errors.set(item.key, error.message || 'Translation failed')
      }

      current++
      if (onProgress) {
        onProgress(current, total)
      }
    }

    return { results, errors }
  }

  /**
   * 批量翻译（分批次）
   * 将大量翻译请求分成多个批次，每个批次使用一次 API 调用
   */
  async batchTranslateChunked(
    request: BatchTranslateRequest,
    chunkSize: number = 20,
    onProgress?: ProgressCallback,
    checkCancellation?: CancellationCallback
  ): Promise<BatchTranslateResponse> {
    const { items, targetLanguage, sourceLanguage = Language.DEF } = request
    const results = new Map<string, string | string[]>()
    const errors = new Map<string, string>()

    const total = items.length
    let processed = 0

    // 分批处理
    for (let i = 0; i < items.length; i += chunkSize) {
      // 检查是否取消
      if (checkCancellation && checkCancellation()) {
        throw new Error('Translation cancelled')
      }

      const chunk = items.slice(i, i + chunkSize)

      try {
        const chunkResults = await this.translateChunk(chunk, targetLanguage, sourceLanguage)

        // 合并结果
        for (const [key, value] of chunkResults.entries()) {
          results.set(key, value)
        }
      } catch (error: any) {
        // 如果批量翻译失败，逐个翻译该批次
        for (const item of chunk) {
          // 检查是否取消
          if (checkCancellation && checkCancellation()) {
            throw new Error('Translation cancelled')
          }

          try {
            if (typeof item.text === 'string') {
              const response = await this.translate({
                text: item.text,
                targetLanguage,
                sourceLanguage,
                context: item.context,
              })
              results.set(item.key, response.translatedText)
            } else {
              const translatedArray = await this.translateArray(
                item.text,
                item.key,
                targetLanguage,
                sourceLanguage
              )
              results.set(item.key, translatedArray)
            }
          } catch (err: any) {
            errors.set(item.key, err.message || 'Translation failed')
          }
        }
      }

      processed += chunk.length
      if (onProgress) {
        onProgress(processed, total)
      }
    }

    return { results, errors }
  }

  /**
   * 翻译一个批次
   */
  private async translateChunk(
    items: Array<{ key: string; text: string | string[]; context?: string }>,
    targetLanguage: Language,
    sourceLanguage: Language
  ): Promise<Map<string, string | string[]>> {
    const targetLangInfo = LANGUAGE_MAP[targetLanguage]
    const sourceLangInfo = LANGUAGE_MAP[sourceLanguage]

    if (!targetLangInfo) {
      throw new Error(`Unsupported target language: ${targetLanguage}`)
    }

    // 构建批量翻译提示词
    const prompt = this.buildBatchPrompt(
      items,
      sourceLangInfo?.nameEn || 'English',
      targetLangInfo.nameEn
    )

    // 调用 OpenAI API
    const response = await this.callOpenAI(prompt, true)

    // 解析响应
    return this.parseBatchResponse(response, items)
  }

  /**
   * 构建单个翻译提示词
   */
  private buildPrompt(
    text: string,
    sourceLang: string,
    targetLang: string,
    context?: string
  ): string {
    const contextBlock = context
      ? `Context: This is an Android string resource named "${context}".\n\n`
      : ''
    const extraPromptBlock = this.config.promptExtra
      ? `- Additional context: ${this.config.promptExtra}\n`
      : ''
    return renderPromptTemplate(SINGLE_PROMPT_TEMPLATE, {
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      contextBlock,
      text,
      extraPromptBlock,
    })
  }

  /**
   * 构建批量翻译提示词
   */
  private buildBatchPrompt(
    items: Array<{ key: string; text: string | string[]; context?: string }>,
    sourceLang: string,
    targetLang: string
  ): string {
    const textsObj: Record<string, any> = {}

    for (const item of items) {
      // 构建包含上下文的结构
      textsObj[item.key] = {
        text: item.text,
        context: item.context || item.key,
      }
    }

    const extraPromptBlock = this.config.promptExtra
      ? `- Additional context: ${this.config.promptExtra}\n`
      : ''

    return renderPromptTemplate(BATCH_PROMPT_TEMPLATE, {
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      textsJson: JSON.stringify(textsObj, null, 2),
      extraPromptBlock,
      contextBlock: '',
      text: '',
    })
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(prompt: string, expectJson: boolean = false): Promise<string> {
    // 如果没有取消信号，创建一个
    if (!this.abortController || this.abortController.signal.aborted) {
      this.abortController = new AbortController()
    }

    // 记录请求开始时间
    this.requestStartTime = Date.now()

    let lastError: any = null
    const maxRetries = this.config.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.post(
          '/chat/completions',
          {
            model: this.config.model || DEFAULT_CONFIG.model,
            messages: [
              {
                role: 'system',
                content: expectJson
                  ? 'You are a professional translator. Always respond with valid JSON only.'
                  : 'You are a professional translator. Always respond with the translation only, no explanations.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: this.config.temperature,
            max_tokens: expectJson ? 4000 : 1000,
          },
          {
            signal: this.abortController.signal,
          }
        )

        const content = response.data.choices[0]?.message?.content?.trim()
        if (!content) {
          throw new Error('Empty response from OpenAI')
        }

        // 请求成功，重置开始时间
        this.requestStartTime = null
        this.abortController = null
        return content
      } catch (error: any) {
        lastError = error

        // 检查是否是取消错误
        if (this.isCancelledError(error)) {
          console.info('OpenAI API request cancelled')
          this.requestStartTime = null
          this.abortController = null
          throw new Error('Translation cancelled')
        }

        // 如果是最后一次重试，直接抛出错误
        if (attempt === maxRetries - 1) {
          break
        }

        // 等待后重试（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await this.sleep(delay)
      }
    }

    // 所有重试都失败
    this.requestStartTime = null
    this.abortController = null
    if (this.isCancelledError(lastError)) {
      throw new Error('Translation cancelled')
    }

    const errorMsg =
      lastError?.response?.data?.error?.message || lastError?.message || 'Unknown error'
    throw new Error(`OpenAI API call failed after ${maxRetries} attempts: ${errorMsg}`)
  }

  /**
   * 解析批量翻译响应
   */
  private parseBatchResponse(
    response: string,
    items: Array<{ key: string; text: string | string[] }>
  ): Map<string, string | string[]> {
    const results = new Map<string, string | string[]>()

    try {
      // 尝试提取 JSON（可能在代码块中）
      let jsonStr = response.trim()

      // 移除代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '')
      }

      // 解析 JSON
      const parsed = JSON.parse(jsonStr)

      // 提取翻译结果
      for (const item of items) {
        const translatedValue = parsed[item.key]
        if (translatedValue !== undefined) {
          // 确保返回值的类型与输入一致
          const originalType = Array.isArray(item.text) ? 'array' : 'string'
          const translatedType = Array.isArray(translatedValue) ? 'array' : 'string'

          if (originalType === translatedType) {
            results.set(item.key, translatedValue)
          } else {
            console.warn(
              `Type mismatch for ${item.key}: expected ${originalType}, got ${translatedType}`
            )
            // 类型不匹配时保留原文
            results.set(item.key, item.text)
          }
        } else {
          console.warn(`No translation found for key: ${item.key}`)
          // 未找到翻译时保留原文
          results.set(item.key, item.text)
        }
      }
    } catch (error) {
      // JSON 解析失败，记录错误
      console.warn('Failed to parse batch response as JSON:', error)

      // 这种情况下返回空结果，让调用方处理
      // 调用方会回退到逐个翻译
    }

    return results
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.translate({
        text: 'Hello',
        targetLanguage: 'cn' as Language,
      })

      if (response.translatedText) {
        return {
          success: true,
          message: `Connection successful. Test translation: Hello → ${response.translatedText}`,
        }
      }

      return {
        success: false,
        message: 'Connection established but received empty response',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      }
    }
  }

  /**
   * 翻译字符串数组
   * 将数组拆解为单个字符串进行翻译，再合并结果
   */
  private async translateArray(
    textArray: string[],
    itemKey: string,
    targetLanguage: Language,
    sourceLanguage: Language
  ): Promise<string[]> {
    const results: string[] = []
    const errors: string[] = []

    // 逐个翻译数组元素
    for (let i = 0; i < textArray.length; i++) {
      try {
        const response = await this.translate({
          text: textArray[i],
          targetLanguage,
          sourceLanguage,
          context: `${itemKey}[${i}]`,
        })
        results[i] = response.translatedText
      } catch (error: any) {
        errors.push(`Index ${i}: ${error.message || 'Translation failed'}`)
        // 翻译失败的元素保留原文
        results[i] = textArray[i]
      }
    }

    if (errors.length > 0) {
      console.warn(`Some array elements failed to translate for ${itemKey}:`, errors)
    }

    return results
  }

  /**
   * 睡眠（用于重试延迟）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 判断是否为取消导致的错误
   */
  private isCancelledError(error: any): boolean {
    return (
      axios.isCancel(error) ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError'
    )
  }
}
