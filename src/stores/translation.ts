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
  STOPPING = 'stopping', // 正在停止（等待当前请求结束）
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
  const isCancelled = ref<boolean>(false) // 取消标记

  // 进度跟踪（独立于 tasks 数组）
  const _progressTotal = ref<number>(0) // 总任务数（条目数 × 语言数）
  const _progressTotalDisplay = ref<number>(0) // 显示用总任务数（实际需要翻译的数量）
  const _progressCompleted = ref<number>(0)
  const _progressFailed = ref<number>(0)

  // 计算属性
  const isIdle = computed(() => state.value === TranslationState.IDLE)
  const isTranslating = computed(
    () => state.value === TranslationState.TRANSLATING || state.value === TranslationState.STOPPING
  )
  const isPaused = computed(() => state.value === TranslationState.PAUSED)
  const isCompleted = computed(() => state.value === TranslationState.COMPLETED)
  const hasError = computed(() => state.value === TranslationState.ERROR)
  const isStopping = computed(() => state.value === TranslationState.STOPPING)

  const progress = computed<TranslationProgress>(() => {
    // 使用显示用总任务数（实际需要翻译的数量），与对话框保持一致
    const total = _progressTotalDisplay.value
    const completed = _progressCompleted.value
    const failed = _progressFailed.value
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    // 调试日志
    if (total > 0) {
      logStore.debug(
        `Progress computed (display): ${completed}/${total} (${percentage}%), failed: ${failed}, actual total: ${_progressTotal.value}, state: ${state.value}`
      )
    }

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
    languages: Language[],
    autoUpdateTranslated: boolean = false
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
      isCancelled.value = false // 重置取消标记

      // 创建翻译任务
      const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile!)
      for (const [itemName, item] of items) {
        // 跳过不可翻译的项
        if (!item.translatable) continue

        // 获取原文（默认语言）
        const originalText = item.valueMap.get(Language.DEF)
        if (!originalText) continue

        // 为每个目标语言创建任务
        for (const targetLang of languages) {
          // 跳过已有翻译的项（可选）
          const langData = fileMap?.get(targetLang)
          const langItem = langData?.items.get(itemName)
          const existingValue = langItem?.valueMap.get(targetLang)
          if (!autoUpdateTranslated && existingValue) {
            logStore.trace(
              `Skip existing: ${itemName} for ${targetLang} (autoUpdateTranslated=false)`
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
   * @param items 要翻译的条目Map（key为条目名，value为ResItem）
   * @param languages 目标语言列表
   * @param autoUpdateTranslated 是否更新已有译文
   * @param fileMap 可选的文件映射数据，用于统一的未翻译过滤逻辑
   */
  async function batchTranslate(
    items: Map<string, ResItem>,
    languages: Language[],
    autoUpdateTranslated: boolean = false,
    fileMap?: Map<Language, any>
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
        )}], items=${items.size}, autoUpdateTranslated=${autoUpdateTranslated}`
      )

      // 清空之前的任务和进度
      tasks.value = []
      currentTaskIndex.value = 0
      targetLanguages.value = languages
      error.value = null
      isCancelled.value = false // 重置取消标记
      _progressTotal.value = 0
      _progressTotalDisplay.value = 0
      _progressCompleted.value = 0
      _progressFailed.value = 0

      // 创建新的取消 token
      translator.value?.createCancelToken()

      state.value = TranslationState.TRANSLATING
      logStore.debug(
        `Batch translate started, tasks cleared. Initial tasks.length: ${tasks.value.length}`
      )

      // 获取文件映射（优先使用传入的参数，其次从projectStore获取）
      const currentFileMap =
        fileMap || projectStore.selectedXmlData?.getFileData(projectStore.selectedXmlFile!)
      if (!currentFileMap) {
        throw new Error('File map not available')
      }

      // 预先计算每个语言需要翻译的项目数，避免总量重复计算
      // 注意：总量应该是条目数量 × 语言数量，但显示用总量是实际需要翻译的条目数
      const languageTaskCounts: Record<string, number> = {}
      const languageActualCounts: Record<string, number> = {} // 实际需要翻译的数量
      for (const targetLang of languages) {
        let count = 0
        let actualCount = 0
        for (const [itemName, item] of items) {
          if (!item.translatable) continue

          const originalText = item.valueMap.get(Language.DEF)
          if (!originalText) continue

          // 使用统一的未翻译过滤逻辑
          let shouldSkip = false
          if (!autoUpdateTranslated) {
            const langData = currentFileMap.get(targetLang)
            const langItem = langData?.items.get(itemName)
            const v = langItem?.valueMap.get(targetLang)
            const isMissing =
              typeof v === 'string' ? v.length === 0 : Array.isArray(v) ? v.length === 0 : true

            if (!isMissing) {
              shouldSkip = true
            }
          }

          // 注意：即使shouldSkip=true，我们也要计算count，用于总量统计
          // 但不添加到batchItems中
          count++

          // 实际需要翻译的数量（不包含跳过的）
          if (!shouldSkip) {
            actualCount++
          }
        }
        languageTaskCounts[targetLang] = count
        languageActualCounts[targetLang] = actualCount
      }

      // 计算总任务数：所有语言的任务数之和
      const totalTasks = Object.values(languageTaskCounts).reduce((sum, count) => sum + count, 0)
      const totalActualTasks = Object.values(languageActualCounts).reduce(
        (sum, count) => sum + count,
        0
      )

      _progressTotal.value = totalTasks
      _progressTotalDisplay.value = totalActualTasks // 显示用总量是实际需要翻译的数量
      _progressCompleted.value = 0 // 重置已完成计数

      logStore.info(
        `Pre-calculated total tasks: ${totalTasks} (entries: ${items.size}, languages: ${languages.length}), actual to translate: ${totalActualTasks}`
      )
      logStore.debug(`Per-language task counts:`, languageTaskCounts)
      logStore.debug(`Per-language actual counts:`, languageActualCounts)

      // 按语言分组翻译
      let hasAnyBatchItems = false
      let completedTasks = 0

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

          // 需要再次检查过滤逻辑，因为总量统计包含了所有条目
          // 但实际翻译时只翻译未翻译的条目
          let shouldSkip = false
          if (!autoUpdateTranslated) {
            const langData = currentFileMap.get(targetLang)
            const langItem = langData?.items.get(itemName)
            const v = langItem?.valueMap.get(targetLang)
            const isMissing =
              typeof v === 'string' ? v.length === 0 : Array.isArray(v) ? v.length === 0 : true

            if (!isMissing) {
              shouldSkip = true
              logStore.trace(`Skip ${itemName} for ${targetLang} (has existing translation)`)
            }
          }

          // 如果应该跳过（已有翻译），则不添加到批次中，也不计入任务项（因为显示用总量不包含跳过项）
          if (shouldSkip) {
            logStore.trace(
              `Skip ${itemName} for ${targetLang} (has existing translation, not counted in display total)`
            )
            continue
          }

          // 实际需要翻译的条目
          batchItems.push({
            key: itemName,
            text: originalText,
            context: itemName,
          })

          // 为进度跟踪创建任务项
          tasks.value.push({
            id: `${itemName}_${targetLang}`,
            itemName,
            originalText,
            targetLanguage: targetLang,
            status: 'pending',
          })
          logStore.debug(
            `Added task for translation: ${itemName}->${targetLang}, tasks.length: ${tasks.value.length}, expected display total: ${totalActualTasks}`
          )
        }

        if (batchItems.length === 0) {
          logStore.info(`No items to translate for ${targetLang}`)
          continue
        }

        hasAnyBatchItems = true

        logStore.info(
          `Translating ${batchItems.length} items to ${targetLang} (${languageActualCounts[targetLang]} actual to translate, ${languageTaskCounts[targetLang]} total in this language)...`
        )

        // 批量翻译
        if (!translator.value) {
          throw new Error('Translator not initialized')
        }
        const maxItemsPerRequest = configStore.config.maxItemsPerRequest || 20
        logStore.debug(`Batch size: ${maxItemsPerRequest}`)

        // 分批处理
        for (let i = 0; i < batchItems.length; i += maxItemsPerRequest) {
          // 检查是否取消（这里是最关键的：一旦取消，立即停止后续批次）
          if (isCancelled.value) {
            logStore.info('Translation cancelled - stopping after current batch')
            state.value = TranslationState.STOPPING
            // 不立即返回，让当前批次完成后再处理
            // 这样用户点击停止后，最多再等一个批次的时间
            break
          }

          const chunk = batchItems.slice(i, i + maxItemsPerRequest)
          const chunkStartIdx = i

          try {
            // 更新该批次任务状态为翻译中
            for (let j = 0; j < chunk.length; j++) {
              const taskIdx = tasks.value.findIndex(
                t => t.itemName === chunk[j].key && t.targetLanguage === targetLang
              )
              if (taskIdx !== -1) {
                tasks.value[taskIdx].status = 'translating'
              }
            }

            // 调用批量翻译
            const chunkResult = await translator.value.batchTranslateChunked(
              {
                items: chunk,
                targetLanguage: targetLang,
                sourceLanguage: Language.DEF,
              },
              chunk.length, // 这个批次的大小
              (current, _total) => {
                // 注意：这个回调表示该批次已处理的任务数，不需要额外更新_progressCompleted
                // _progressCompleted 会在翻译结果应用后更新
                logStore.debug(
                  `Batch ${i / maxItemsPerRequest + 1} progress: ${chunkStartIdx + current}/${totalTasks}`
                )
              },
              () => {
                // 取消检查回调
                return isCancelled.value
              }
            )

            // 应用翻译结果
            let batchSuccessCount = 0
            let batchErrorCount = 0
            for (const [itemName, translatedText] of chunkResult.results) {
              try {
                projectStore.selectedXmlData.updateItem(
                  projectStore.selectedXmlFile!,
                  itemName,
                  targetLang,
                  translatedText as string | string[]
                )

                // 更新任务状态为已完成
                const task = tasks.value.find(
                  t => t.itemName === itemName && t.targetLanguage === targetLang
                )
                if (task) {
                  task.translatedText = translatedText
                  task.status = 'completed'
                  batchSuccessCount++
                }
              } catch (err: any) {
                const task = tasks.value.find(
                  t => t.itemName === itemName && t.targetLanguage === targetLang
                )
                if (task) {
                  task.status = 'error'
                  task.error = err.message
                  batchErrorCount++
                }
              }
            }

            // 处理错误（这些错误来自API调用失败，不在chunkResult.results中）
            for (const [itemName, errorMsg] of chunkResult.errors) {
              const task = tasks.value.find(
                t => t.itemName === itemName && t.targetLanguage === targetLang
              )
              if (task) {
                task.status = 'error'
                task.error = errorMsg
                batchErrorCount++
              }
            }

            // 更新该批次的完成和失败计数（基于显示用总量）
            _progressCompleted.value += batchSuccessCount
            _progressFailed.value += batchErrorCount
            completedTasks += chunk.length
            logStore.debug(
              `Batch ${i / maxItemsPerRequest + 1} completed: ${batchSuccessCount} succeeded, ${batchErrorCount} failed. Total progress: ${_progressCompleted.value}/${totalActualTasks}, failed: ${_progressFailed.value}`
            )
          } catch (err: any) {
            // 检查是否是取消错误
            if (err.message === 'Translation cancelled') {
              logStore.info(`Batch ${i / maxItemsPerRequest + 1} cancelled by user`)
              // 抛出让外层统一进入 STOPPING 流程，及时退出“正在停止中”状态
              throw err
            }

            logStore.error(`Batch ${i / maxItemsPerRequest + 1} failed:`, err)

            // 如果整个批次失败，将该批次所有任务标记为错误
            for (const item of chunk) {
              const task = tasks.value.find(
                t => t.itemName === item.key && t.targetLanguage === targetLang
              )
              if (task) {
                task.status = 'error'
                task.error = err.message || 'Batch translation failed'
              }
            }

            // 更新失败计数（整个批次都算失败）
            _progressFailed.value += chunk.length
            completedTasks += chunk.length
            // 注意：批次失败不算完成，因为没有成功翻译任何内容
            logStore.debug(
              `Batch failed, updated progress: ${completedTasks}/${totalActualTasks}, failed: ${_progressFailed.value}`
            )
          }
        }

        // 计算该语言的翻译结果统计
        const langTasks = tasks.value.filter(t => t.targetLanguage === targetLang)
        const totalInThisLang = langTasks.length
        const successCount = langTasks.filter(t => t.status === 'completed').length
        const errorCount = langTasks.filter(t => t.status === 'error').length
        const skippedCount = totalInThisLang - batchItems.length // 被跳过的条目数

        logStore.info(
          `[${targetLang}] Total: ${totalInThisLang}, Should translate (actual): ${languageActualCounts[targetLang]}, Actually translated: ${batchItems.length}, Skipped: ${skippedCount}, Success: ${successCount}, Failed: ${errorCount}`
        )
      }

      // 如果所有目标语言都没有可翻译项，提示并结束
      if (!hasAnyBatchItems) {
        toast.warning('无可翻译的条目')
        state.value = TranslationState.COMPLETED
        logStore.info('Batch translation completed (no items)')
        return
      }

      // 检查是否在翻译过程中被取消（STOPPING 状态）
      if (isCancelled.value) {
        logStore.info('Batch translation stopped by user')
        state.value = TranslationState.IDLE
        // 重置当前任务索引
        currentTaskIndex.value = 0
        return
      }

      state.value = TranslationState.COMPLETED
      logStore.info(
        `Batch translation completed. Display progress: ${_progressCompleted.value}/${_progressTotalDisplay.value} (${progress.value.percentage}%), failed: ${_progressFailed.value}. Actual total: ${_progressTotal.value}`
      )
      // 批量翻译完成后统一刷新表格视图
      try {
        projectStore.dataVersion++
        logStore.debug('UI refresh triggered after batch translation (dataVersion++)')
      } catch {}
    } catch (err: any) {
      // 如果处于 STOPPING 状态，不视为错误（用户主动停止）
      if (state.value === TranslationState.STOPPING || isCancelled.value) {
        logStore.info('Batch translation stopped by user')
        state.value = TranslationState.IDLE
        return
      }

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
      // 检查是否取消
      if (isCancelled.value) {
        logStore.info('Translation cancelled')
        state.value = TranslationState.IDLE
        return
      }

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
          logStore.debug(`Translating ${task.itemName} -> ${task.targetLanguage}`)
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
            logStore.trace(`Applied translation: ${task.itemName} -> ${task.targetLanguage}`)
          }

          logStore.debug(`Translated ${task.itemName} to ${task.targetLanguage}`)
        } else {
          // 字符串数组翻译：逐个元素翻译
          logStore.debug(`Translating array ${task.itemName} -> ${task.targetLanguage}`)

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
              logStore.warning(`Failed to translate ${task.itemName}[${i}], keeping original`)
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
            logStore.trace(`Applied array translation: ${task.itemName} -> ${task.targetLanguage}`)
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
    isCancelled.value = true
    state.value = TranslationState.STOPPING

    // 立即取消网络请求（智能取消：请求刚开始则立即取消，已开始则5秒超时）
    if (translator.value) {
      const elapsed = translator.value.getRequestElapsed()
      logStore.info(`Stopping translation (request elapsed: ${elapsed}ms)`)
      translator.value.cancel('Translation cancelled by user')
    }

    logStore.info('Translation stop requested')
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
    isCancelled,

    // 计算属性
    isIdle,
    isTranslating,
    isPaused,
    isCompleted,
    hasError,
    isStopping,
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
