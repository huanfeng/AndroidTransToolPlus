/**
 * OpenAI 翻译服务
 * 使用 GPT-4o-mini 进行翻译
 */

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Language, LANGUAGE_MAP } from '@/models/language'

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
    text: string // 要翻译的文本
    context?: string // 上下文信息
  }>
  targetLanguage: Language // 目标语言
  sourceLanguage?: Language // 源语言
}

/**
 * 批量翻译响应
 */
export interface BatchTranslateResponse {
  results: Map<string, string> // key -> translated text
  errors: Map<string, string> // key -> error message
}

/**
 * 翻译进度回调
 */
export type ProgressCallback = (current: number, total: number) => void

/**
 * OpenAI 翻译配置
 */
export interface OpenAIConfig {
  apiUrl: string // API URL
  apiToken: string // API Token
  model?: string // 模型名称（默认 gpt-4o-mini）
  httpProxy?: string // HTTP 代理
  maxRetries?: number // 最大重试次数
  timeout?: number // 超时时间（毫秒）
  temperature?: number // 温度参数（0-1）
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
  model: 'gpt-4o-mini',
  maxRetries: 3,
  timeout: 30000,
  temperature: 0.3, // 较低的温度以获得更一致的翻译
}

/**
 * OpenAI 翻译服务
 */
export class OpenAITranslator {
  private config: OpenAIConfig
  private client: AxiosInstance

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
        'Authorization': `Bearer ${this.config.apiToken}`,
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
    onProgress?: ProgressCallback
  ): Promise<BatchTranslateResponse> {
    const { items, targetLanguage, sourceLanguage = Language.DEF } = request
    const results = new Map<string, string>()
    const errors = new Map<string, string>()

    const total = items.length
    let current = 0

    for (const item of items) {
      try {
        const response = await this.translate({
          text: item.text,
          targetLanguage,
          sourceLanguage,
          context: item.context,
        })
        results.set(item.key, response.translatedText)
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
    onProgress?: ProgressCallback
  ): Promise<BatchTranslateResponse> {
    const { items, targetLanguage, sourceLanguage = Language.DEF } = request
    const results = new Map<string, string>()
    const errors = new Map<string, string>()

    const total = items.length
    let processed = 0

    // 分批处理
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)

      try {
        const chunkResults = await this.translateChunk(
          chunk,
          targetLanguage,
          sourceLanguage
        )

        // 合并结果
        for (const [key, value] of chunkResults.entries()) {
          results.set(key, value)
        }
      } catch (error: any) {
        // 如果批量翻译失败，逐个翻译该批次
        for (const item of chunk) {
          try {
            const response = await this.translate({
              text: item.text,
              targetLanguage,
              sourceLanguage,
              context: item.context,
            })
            results.set(item.key, response.translatedText)
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
    items: Array<{ key: string; text: string; context?: string }>,
    targetLanguage: Language,
    sourceLanguage: Language
  ): Promise<Map<string, string>> {
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
    let prompt = `Translate the following text from ${sourceLang} to ${targetLang}.\n\n`

    if (context) {
      prompt += `Context: This is an Android string resource named "${context}".\n\n`
    }

    prompt += `Original text:\n${text}\n\n`
    prompt += `Requirements:\n`
    prompt += `- Maintain the original meaning and tone\n`
    prompt += `- Keep any placeholders like %s, %d, %1$s unchanged\n`
    prompt += `- Preserve special characters and formatting\n`
    prompt += `- Return ONLY the translated text, no explanations\n\n`
    prompt += `Translation:`

    return prompt
  }

  /**
   * 构建批量翻译提示词
   */
  private buildBatchPrompt(
    items: Array<{ key: string; text: string; context?: string }>,
    sourceLang: string,
    targetLang: string
  ): string {
    let prompt = `Translate the following texts from ${sourceLang} to ${targetLang}.\n\n`
    prompt += `Requirements:\n`
    prompt += `- Maintain the original meaning and tone\n`
    prompt += `- Keep any placeholders like %s, %d, %1$s unchanged\n`
    prompt += `- Preserve special characters and formatting\n`
    prompt += `- Return results in JSON format: {"key": "translation"}\n\n`
    prompt += `Texts to translate:\n`

    const textsObj: Record<string, string> = {}
    for (const item of items) {
      textsObj[item.key] = item.text
    }

    prompt += JSON.stringify(textsObj, null, 2)
    prompt += `\n\nTranslations (JSON only):`

    return prompt
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    expectJson: boolean = false
  ): Promise<string> {
    let lastError: any = null
    const maxRetries = this.config.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.post('/chat/completions', {
          model: this.config.model,
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
        })

        const content = response.data.choices[0]?.message?.content?.trim()
        if (!content) {
          throw new Error('Empty response from OpenAI')
        }

        return content
      } catch (error: any) {
        lastError = error

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
    const errorMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Unknown error'
    throw new Error(`OpenAI API call failed after ${maxRetries} attempts: ${errorMsg}`)
  }

  /**
   * 解析批量翻译响应
   */
  private parseBatchResponse(
    response: string,
    items: Array<{ key: string; text: string }>
  ): Map<string, string> {
    const results = new Map<string, string>()

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
        if (parsed[item.key]) {
          results.set(item.key, parsed[item.key])
        }
      }
    } catch (error) {
      // JSON 解析失败，尝试逐行解析
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
   * 睡眠（用于重试延迟）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
