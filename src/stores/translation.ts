/**
 * 翻译状态管理
 * 管理翻译任务和进度
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Language } from '@/models/language'
import { resolveAiModel } from '@/models/ai'
import type { ResItem } from '@/models/resource'
import { OpenAITranslator, type OpenAIConfig } from '@/services/translation/openai'
import toast from '@/utils/toast'
import { useConfigStore } from './config'
import { useLogStore } from './log'
import { useProjectStore } from './project'

/**
 * 翻译状态
 */
export enum TranslationState {
  IDLE = 'idle', // 空闲
  TRANSLATING = 'translating', // 翻译中
  PAUSED = 'paused', // 已暂停
  COMPLETED = 'completed', // 已完成
  ERROR = 'error', // 错误
}

/**
 * 翻译任务
 */
export interface TranslationTask {
  id: string // 任务 ID
  itemName: string // 资源项名称
  originalText: string | string[] // 原文
  targetLanguage: Language // 目标语言
  translatedText?: string | string[] // 译文
  status: 'pending' | 'translating' | 'completed' | 'error' // 状态
  error?: string // 错误信息
}

/**
 * 翻译进度
 */
export interface TranslationProgress {
  total: number // 总数
  completed: number // 已完成
  failed: number // 失败
  percentage: number // 百分比
}

export const useTranslationStore = defineStore('translation', () => {
  const configStore = useConfigStore()
  const logStore = useLogStore()
  const projectStore = useProjectStore()

  // 状态
  const state = ref<TranslationState>(TranslationState.IDLE)
  const translator = ref<OpenAITranslator | null>(null)
  const tasks = ref<TranslationTask[]>([])
  const currentTaskIndex = ref<number>(0)
  const targetLanguages = ref<Language[]>([])
  const error = ref<string | null>(null)

  // 计算属性
  const isIdle = computed(() => state.value === TranslationState.IDLE)
  const isTranslating = computed(() => state.value === TranslationState.TRANSLATING)
  const isPaused = computed(() => state.value === TranslationState.PAUSED)
  const isCompleted = computed(() => state.value === TranslationState.COMPLETED)
  const hasError = computed(() => state.value === TranslationState.ERROR)

  const progress = computed<TranslationProgress>(() => {
    const total = tasks.value.length
    const completed = tasks.value.filter(t => t.status === 'completed').length
    const failed = tasks.value.filter(t => t.status === 'error').length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, failed, percentage }
  })

  const currentTask = computed<TranslationTask | null>(() => {
    if (currentTaskIndex.value >= 0 && currentTaskIndex.value < tasks.value.length) {
      return tasks.value[currentTaskIndex.value]
    }
    return null
  })

  /**
   * 初始化翻译器
   */
  function initTranslator(): void {
    const config = configStore.config

    if (!config.apiUrl || !config.apiKey) {
      throw new Error('API URL and Key are required')
    }

    const translatorConfig: OpenAIConfig = {
      apiUrl: config.apiUrl,
      apiToken: config.apiKey,
      httpProxy: config.httpProxy,
      maxRetries: config.maxRetries,
      timeout: config.requestTimeout,
      model: resolveAiModel(config.aiModelPreset, config.aiCustomModel),
      promptExtra: config.aiPromptExtra?.trim() || undefined,
    }

    if (!translator.value) {
      translator.value = new OpenAITranslator(translatorConfig)
      logStore.info('Translation service initialized')
    } else {
      translator.value.updateConfig(translatorConfig)
      logStore.debug('Translation service config refreshed')
    }
  }

  /**
   * 测试连接
   */
  async function testConnection(): Promise<boolean> {
    try {
      initTranslator()

      logStore.info('Testing OpenAI connection...')
      const result = await translator.value!.testConnection()

      if (result.success) {
        logStore.info(result.message)
        return true
      } else {
        logStore.error(result.message)
        return false
      }
    } catch (err: any) {
      logStore.error('Connection test failed', err)
      return false
    }
  }

  /**
   * 开始翻译
   */
  async function startTranslation(
    items: Map<string, ResItem>,
    languages: Language[]
  ): Promise<void> {
    if (!projectStore.selectedXmlData) {
      throw new Error('No XML data selected')
    }

    try {
      // 初始化 / 刷新翻译器
      initTranslator()

      logStore.info('Starting translation...')
      logStore.debug(
        `Context: file=${projectStore.selectedXmlFile}, langs=[${languages.join(
          ', '
        )}], items=${items.size}`
      )

      // 清空之前的任务
      tasks.value = []
      currentTaskIndex.value = 0
      targetLanguages.value = languages
      error.value = null

      // 创建翻译任务
      for (const [itemName, item] of items) {
        // 跳过不可翻译的项
        if (!item.translatable) continue

        // 获取原文（默认语言）
        const originalText = item.valueMap.get(Language.DEF)
        if (!originalText) continue

        // 为每个目标语言创建任务
        for (const targetLang of languages) {
          // 跳过已有翻译的项（可选）
          const existingValue = item.valueMap.get(targetLang)
          if (configStore.config.autoRetry === false && existingValue) {
            logStore.trace(
              `Skip existing: ${itemName} for ${targetLang} (autoRetry=false)`
            )
            continue
          }

          tasks.value.push({
            id: `${itemName}_${targetLang}`,
            itemName,
            originalText,
            targetLanguage: targetLang,
            status: 'pending',
          })
        }
      }

      if (tasks.value.length === 0) {
        logStore.warning('No items to translate')
        // Toast to notify when logs panel may be hidden
        toast.warning('无可翻译的条目')
        state.value = TranslationState.COMPLETED
        return
      }

      logStore.info(`Created ${tasks.value.length} translation tasks`)

      // 开始翻译
      state.value = TranslationState.TRANSLATING
      await processTranslationTasks()
      // 翻译结束后触发视图刷新（懒加载数据结构使用 dataVersion 驱动）
      try {
        projectStore.dataVersion++
        logStore.debug('UI refresh triggered after translation (dataVersion++)')
      } catch {}
    } catch (err: any) {
      logStore.error('Failed to start translation', err)
      error.value = err.message || 'Unknown error'
      state.value = TranslationState.ERROR
      throw err
    }
  }

  /**
   * 批量翻译
   */
  async function batchTranslate(
    items: Map<string, ResItem>,
    languages: Language[]
  ): Promise<void> {
    if (!projectStore.selectedXmlData) {
      throw new Error('No XML data selected')
    }

    try {
      initTranslator()

      logStore.info('Starting batch translation...')
      logStore.debug(
        `Context: file=${projectStore.selectedXmlFile}, langs=[${languages.join(
          ', '
        )}], items=${items.size}`
      )

      // 清空之前的任务
      tasks.value = []
      currentTaskIndex.value = 0
      targetLanguages.value = languages
      error.value = null
      state.value = TranslationState.TRANSLATING

      // 按语言分组翻译
      let hasAnyBatchItems = false
      for (const targetLang of languages) {
        // 准备批量翻译请求
        const batchItems: Array<{
          key: string
          text: string | string[]
          context?: string
        }> = []

        for (const [itemName, item] of items) {
          if (!item.translatable) continue

          const originalText = item.valueMap.get(Language.DEF)
          if (!originalText) continue

          // 跳过已有翻译的项
          const existingValue = item.valueMap.get(targetLang)
          if (configStore.config.autoRetry === false && existingValue) {
            continue
          }

          // 支持字符串和字符串数组类型
          batchItems.push({
            key: itemName,
            text: originalText,
            context: itemName,
          })
        }

        if (batchItems.length === 0) {
          logStore.info(`No items to translate for ${targetLang}`)
          continue
        }

        hasAnyBatchItems = true

        logStore.info(`Translating ${batchItems.length} items to ${targetLang}...`)

        // 批量翻译
        if (!translator.value) {
          throw new Error('Translator not initialized')
        }
        const maxItemsPerRequest = configStore.config.maxItemsPerRequest || 20
        const result = await translator.value.batchTranslateChunked(
          {
            items: batchItems,
            targetLanguage: targetLang,
            sourceLanguage: Language.DEF,
          },
          maxItemsPerRequest,
          (current, total) => {
            logStore.debug(`Progress: ${current}/${total}`)
          }
        )

        // 应用翻译结果
        let successCount = 0
        for (const [itemName, translatedText] of result.results) {
          projectStore.selectedXmlData.updateItem(
            projectStore.selectedXmlFile!,
            itemName,
            targetLang,
            translatedText as string | string[]
          )
          logStore.trace(
            `Applied translation: ${itemName} -> ${targetLang}`
          )
          successCount++
        }

        logStore.info(`Translated ${successCount} items to ${targetLang}`)

        // 记录错误
        if (result.errors.size > 0) {
          logStore.warning(`${result.errors.size} items failed to translate`)
          for (const [itemName, errorMsg] of result.errors) {
            logStore.error(`Failed to translate ${itemName}: ${errorMsg}`)
          }
        }
      }

      // 如果所有目标语言都没有可翻译项，提示并结束
      if (!hasAnyBatchItems) {
        toast.warning('无可翻译的条目')
        state.value = TranslationState.COMPLETED
        logStore.info('Batch translation completed (no items)')
        return
      }

      state.value = TranslationState.COMPLETED
      logStore.info('Batch translation completed')
      // 批量翻译完成后统一刷新表格视图
      try {
        projectStore.dataVersion++
        logStore.debug('UI refresh triggered after batch translation (dataVersion++)')
      } catch {}
    } catch (err: any) {
      logStore.error('Batch translation failed', err)
      error.value = err.message || 'Unknown error'
      state.value = TranslationState.ERROR
      throw err
    }
  }

  /**
   * 处理翻译任务
   */
  async function processTranslationTasks(): Promise<void> {
    while (currentTaskIndex.value < tasks.value.length) {
      // 检查是否暂停
      if (state.value === TranslationState.PAUSED) {
        logStore.info('Translation paused')
        return
      }

      const task = tasks.value[currentTaskIndex.value]
      task.status = 'translating'

      try {
        // 翻译
        const originalText = task.originalText
        if (typeof originalText === 'string') {
          // 单个字符串翻译
          logStore.debug(
            `Translating ${task.itemName} -> ${task.targetLanguage}`
          )
          const response = await translator.value!.translate({
            text: originalText,
            targetLanguage: task.targetLanguage,
            sourceLanguage: Language.DEF,
            context: task.itemName,
          })

          task.translatedText = response.translatedText
          task.status = 'completed'

          // 应用翻译结果
          if (projectStore.selectedXmlData && projectStore.selectedXmlFile) {
            projectStore.selectedXmlData.updateItem(
              projectStore.selectedXmlFile,
              task.itemName,
              task.targetLanguage,
              response.translatedText
            )
            logStore.trace(
              `Applied translation: ${task.itemName} -> ${task.targetLanguage}`
            )
          }

          logStore.debug(`Translated ${task.itemName} to ${task.targetLanguage}`)
        } else {
          // 字符串数组翻译：逐个元素翻译
          logStore.debug(
            `Translating array ${task.itemName} -> ${task.targetLanguage}`
          )

          const translatedArray: string[] = []
          for (let i = 0; i < originalText.length; i++) {
            try {
              const response = await translator.value!.translate({
                text: originalText[i],
                targetLanguage: task.targetLanguage,
                sourceLanguage: Language.DEF,
                context: `${task.itemName}[${i}]`,
              })
              translatedArray[i] = response.translatedText
            } catch (err: any) {
              // 翻译失败的元素保留原文
              logStore.warning(
                `Failed to translate ${task.itemName}[${i}], keeping original`
              )
              translatedArray[i] = originalText[i]
            }
          }

          task.translatedText = translatedArray
          task.status = 'completed'

          // 应用翻译结果
          if (projectStore.selectedXmlData && projectStore.selectedXmlFile) {
            projectStore.selectedXmlData.updateItem(
              projectStore.selectedXmlFile,
              task.itemName,
              task.targetLanguage,
              translatedArray
            )
            logStore.trace(
              `Applied array translation: ${task.itemName} -> ${task.targetLanguage}`
            )
          }

          logStore.debug(
            `Translated array ${task.itemName} to ${task.targetLanguage} (${originalText.length} items)`
          )
        }
      } catch (err: any) {
        task.status = 'error'
        task.error = err.message || 'Translation failed'
        logStore.error(`Failed to translate ${task.itemName}`, err)
      }

      currentTaskIndex.value++
    }

    // 所有任务完成
    state.value = TranslationState.COMPLETED
    logStore.info(
      `Translation completed: ${progress.value.completed} succeeded, ${progress.value.failed} failed`
    )
    // 任务模式翻译完成后刷新视图
    try {
      projectStore.dataVersion++
      logStore.debug('UI refresh triggered after tasks (dataVersion++)')
    } catch {}
  }

  /**
   * 暂停翻译
   */
  function pauseTranslation(): void {
    if (state.value === TranslationState.TRANSLATING) {
      state.value = TranslationState.PAUSED
      logStore.info('Translation paused')
    }
  }

  /**
   * 恢复翻译
   */
  async function resumeTranslation(): Promise<void> {
    if (state.value === TranslationState.PAUSED) {
      state.value = TranslationState.TRANSLATING
      logStore.info('Translation resumed')
      await processTranslationTasks()
    }
  }

  /**
   * 停止翻译
   */
  function stopTranslation(): void {
    state.value = TranslationState.IDLE
    currentTaskIndex.value = 0
    logStore.info('Translation stopped')
  }

  /**
   * 重试失败的任务
   */
  async function retryFailedTasks(): Promise<void> {
    const failedTasks = tasks.value.filter(t => t.status === 'error')

    if (failedTasks.length === 0) {
      logStore.info('No failed tasks to retry')
      return
    }

    logStore.info(`Retrying ${failedTasks.length} failed tasks...`)

    // 重置失败任务的状态
    for (const task of failedTasks) {
      task.status = 'pending'
      task.error = undefined
    }

    // 重置索引到第一个失败任务
    const firstFailedIndex = tasks.value.findIndex(t => t.status === 'pending')
    if (firstFailedIndex !== -1) {
      currentTaskIndex.value = firstFailedIndex
      state.value = TranslationState.TRANSLATING
      await processTranslationTasks()
    }
  }

  /**
   * 清空任务
   */
  function clearTasks(): void {
    tasks.value = []
    currentTaskIndex.value = 0
    state.value = TranslationState.IDLE
    error.value = null
    logStore.debug('Translation tasks cleared')
  }

  /**
   * 导出翻译结果
   */
  function exportResults(): string {
    const results: any = {
      timestamp: new Date().toISOString(),
      progress: progress.value,
      tasks: tasks.value.map(task => ({
        itemName: task.itemName,
        targetLanguage: task.targetLanguage,
        originalText: task.originalText,
        translatedText: task.translatedText,
        status: task.status,
        error: task.error,
      })),
    }

    return JSON.stringify(results, null, 2)
  }

  return {
    // 状态
    state,
    translator,
    tasks,
    currentTaskIndex,
    targetLanguages,
    error,

    // 计算属性
    isIdle,
    isTranslating,
    isPaused,
    isCompleted,
    hasError,
    progress,
    currentTask,

    // 方法
    initTranslator,
    testConnection,
    startTranslation,
    batchTranslate,
    async translateSingle(itemName: string, lang: Language): Promise<void> {
      if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) {
        throw new Error('No XML data selected')
      }
      initTranslator()
      const xml = projectStore.selectedXmlData
      const file = projectStore.selectedXmlFile
      const fileMap = xml.getFileData(file)
      if (!fileMap) throw new Error('Selected file not loaded')
      const defData = fileMap.get(Language.DEF)
      if (!defData) throw new Error('Default language not available')
      const item = defData.items.get(itemName)
      if (!item) throw new Error('Item not found')
      const originalText = item.valueMap.get(Language.DEF)
      if (!originalText || Array.isArray(originalText)) {
        throw new Error('Only single string items supported for quick translate')
      }
      if (!translator.value) throw new Error('Translator not initialized')
      const res = await translator.value.translate({
        text: originalText,
        targetLanguage: lang,
        sourceLanguage: Language.DEF,
        context: itemName,
      })
      xml.updateItem(file, itemName, lang, res.translatedText)
      // 单条翻译后立即刷新视图，获得即时反馈
      try {
        projectStore.dataVersion++
        logStore.debug('UI refresh triggered after single translate (dataVersion++)')
      } catch {}
    },
    pauseTranslation,
    resumeTranslation,
    stopTranslation,
    retryFailedTasks,
    clearTasks,
    exportResults,
  }
})
