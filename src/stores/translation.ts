/**
 * 翻译状态管理
 * 管理翻译任务和进度
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LANGUAGE, type Language } from '@/models/language'
import { resolveAiModel } from '@/models/ai'
import type { ResItem } from '@/models/resource'
import { OpenAITranslator, type OpenAIConfig } from '@/services/translation/openai'
import type { XmlData } from '@/services/project/xmldata'
import toast from '@/utils/toast'
import { i18n } from '@/locales'
import { useConfigStore } from './config'
import { useLogStore } from './log'
import { useProjectStore } from './project'

const t = i18n.global.t

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
  const _progressFilesTotal = ref<number>(0) // 文件总数（项目级）
  const _progressFilesCompleted = ref<number>(0) // 已处理文件数（项目级）
  const currentFileName = ref<string | null>(null)
  const currentResDir = ref<string | null>(null)

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

  const projectProgress = computed(() => ({
    filesTotal: _progressFilesTotal.value,
    filesCompleted: _progressFilesCompleted.value,
  }))

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
      _progressFilesTotal.value = 1
      _progressFilesCompleted.value = 0
      currentFileName.value = projectStore.selectedXmlFile
      currentResDir.value = projectStore.selectedResDir

      // 创建翻译任务
      const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile!)
      for (const [itemName, item] of items) {
        // 跳过不可翻译的项
        if (!item.translatable) continue

        // 获取原文（默认语言）
        const originalText = item.valueMap.get(LANGUAGE.DEF)
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
        toast.warning(t('workbench.toast.noTranslatableItems'))
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
        _progressFilesCompleted.value = 1
      } catch {}
      currentFileName.value = null
      currentResDir.value = null
    } catch (err: any) {
      logStore.error('Failed to start translation', err)
      error.value = err.message || 'Unknown error'
      state.value = TranslationState.ERROR
      currentFileName.value = null
      currentResDir.value = null
      throw err
    }
  }

  /**
   * 通用文件级批量翻译（可被项目级复用）
   */
  async function batchTranslateForFile(params: {
    xmlData: XmlData
    fileName: string
    items: Map<string, ResItem>
    languages: Language[]
    autoUpdateTranslated?: boolean
    fileMap?: Map<Language, any>
    resetProgress?: boolean
    finalizeState?: boolean
    bumpDataVersion?: boolean
    reuseCancelToken?: boolean
    resPath?: string
  }): Promise<void> {
    const {
      xmlData,
      fileName,
      items,
      languages,
      autoUpdateTranslated = false,
      fileMap,
      resetProgress = true,
      finalizeState = true,
      bumpDataVersion = true,
      reuseCancelToken = false,
      resPath,
    } = params

    try {
      initTranslator()

      logStore.info(`Starting batch translation for ${fileName}...`)
      logStore.debug(
        `Context: file=${fileName}, langs=[${languages.join(
          ', '
        )}], items=${items.size}, autoUpdateTranslated=${autoUpdateTranslated}`
      )

      if (resetProgress) {
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
        _progressFilesTotal.value = 1
        _progressFilesCompleted.value = 0
      } else {
        error.value = null
      }

      // 创建新的取消 token（除非要求复用已有的）
      if (!reuseCancelToken) {
        translator.value?.createCancelToken()
      }

      state.value = TranslationState.TRANSLATING
      currentFileName.value = fileName
      currentResDir.value = resPath || projectStore.selectedResDir || null
      logStore.debug(
        `Batch translate started, tasks cleared: ${resetProgress}. Initial tasks.length: ${tasks.value.length}`
      )

      // 获取文件映射（优先使用传入的参数）
      const currentFileMap = fileMap || xmlData.getFileData(fileName)
      if (!currentFileMap) {
        throw new Error('File map not available')
      }

      const languageTaskCounts: Record<string, number> = {}
      const languageActualCounts: Record<string, number> = {}
      for (const targetLang of languages) {
        let count = 0
        let actualCount = 0
        for (const [itemName, item] of items) {
          if (!item.translatable) continue
          const originalText = item.valueMap.get(LANGUAGE.DEF)
          if (!originalText) continue

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

          count++
          if (!shouldSkip) actualCount++
        }
        languageTaskCounts[targetLang] = count
        languageActualCounts[targetLang] = actualCount
      }

      const totalTasks = Object.values(languageTaskCounts).reduce((sum, count) => sum + count, 0)
      const totalActualTasks = Object.values(languageActualCounts).reduce(
        (sum, count) => sum + count,
        0
      )

      if (resetProgress) {
        _progressTotal.value = totalTasks
        _progressTotalDisplay.value = totalActualTasks
        _progressCompleted.value = 0
      }

      logStore.info(
        `Pre-calculated total tasks: ${totalTasks} (entries: ${items.size}, languages: ${languages.length}), actual to translate: ${totalActualTasks}`
      )
      logStore.debug(`Per-language task counts:`, languageTaskCounts)
      logStore.debug(`Per-language actual counts:`, languageActualCounts)

      let hasAnyBatchItems = false
      let completedTasks = 0

      for (const targetLang of languages) {
        const batchItems: Array<{ key: string; text: string | string[]; context?: string }> = []

        for (const [itemName, item] of items) {
          if (!item.translatable) continue
          const originalText = item.valueMap.get(LANGUAGE.DEF)
          if (!originalText) continue

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

          if (shouldSkip) {
            logStore.trace(
              `Skip ${itemName} for ${targetLang} (has existing translation, not counted in display total)`
            )
            continue
          }

          batchItems.push({ key: itemName, text: originalText, context: itemName })
          tasks.value.push({
            id: `${itemName}_${targetLang}_${fileName}`,
            itemName,
            originalText,
            targetLanguage: targetLang,
            status: 'pending',
          })
        }

        if (batchItems.length === 0) {
          logStore.info(`No items to translate for ${targetLang}`)
          continue
        }

        hasAnyBatchItems = true
        logStore.info(
          `Translating ${batchItems.length} items to ${targetLang} (${languageActualCounts[targetLang]} actual to translate, ${languageTaskCounts[targetLang]} total in this language)...`
        )

        if (!translator.value) throw new Error('Translator not initialized')
        const maxItemsPerRequest = configStore.config.maxItemsPerRequest || 20
        logStore.debug(`Batch size: ${maxItemsPerRequest}`)

        for (let i = 0; i < batchItems.length; i += maxItemsPerRequest) {
          if (isCancelled.value) {
            logStore.info('Translation cancelled - stopping after current batch')
            state.value = TranslationState.STOPPING
            break
          }

          const chunk = batchItems.slice(i, i + maxItemsPerRequest)
          const chunkStartIdx = i

          try {
            for (let j = 0; j < chunk.length; j++) {
              const taskIdx = tasks.value.findIndex(
                t => t.itemName === chunk[j].key && t.targetLanguage === targetLang
              )
              if (taskIdx !== -1) {
                tasks.value[taskIdx].status = 'translating'
              }
            }

            const chunkResult = await translator.value.batchTranslateChunked(
              {
                items: chunk,
                targetLanguage: targetLang,
                sourceLanguage: configStore.config.defaultSourceLanguage || LANGUAGE.DEF,
              },
              chunk.length,
              (current, _total) => {
                logStore.debug(
                  `Batch ${i / maxItemsPerRequest + 1} progress: ${chunkStartIdx + current}/${totalTasks}`
                )
              },
              () => isCancelled.value
            )

            let batchSuccessCount = 0
            let batchErrorCount = 0
            for (const [itemName, translatedText] of chunkResult.results) {
              try {
                xmlData.updateItem(
                  fileName,
                  itemName,
                  targetLang,
                  translatedText as string | string[]
                )
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

            _progressCompleted.value += batchSuccessCount
            _progressFailed.value += batchErrorCount
            completedTasks += chunk.length
            logStore.debug(
              `Batch ${i / maxItemsPerRequest + 1} completed: ${batchSuccessCount} succeeded, ${batchErrorCount} failed. Total progress: ${_progressCompleted.value}/${_progressTotalDisplay.value || totalActualTasks}, failed: ${_progressFailed.value}`
            )
          } catch (err: any) {
            if (err.message === 'Translation cancelled') {
              logStore.info(`Batch ${i / maxItemsPerRequest + 1} cancelled by user`)
              throw err
            }

            logStore.error(`Batch ${i / maxItemsPerRequest + 1} failed:`, err)

            for (const item of chunk) {
              const task = tasks.value.find(
                t => t.itemName === item.key && t.targetLanguage === targetLang
              )
              if (task) {
                task.status = 'error'
                task.error = err.message || 'Batch translation failed'
              }
            }

            _progressFailed.value += chunk.length
            completedTasks += chunk.length
            logStore.debug(
              `Batch failed, updated progress: ${completedTasks}/${_progressTotalDisplay.value || totalActualTasks}, failed: ${_progressFailed.value}`
            )
          }
        }

        const langTasks = tasks.value.filter(t => t.targetLanguage === targetLang)
        const totalInThisLang = langTasks.length
        const successCount = langTasks.filter(t => t.status === 'completed').length
        const errorCount = langTasks.filter(t => t.status === 'error').length
        const skippedCount = totalInThisLang - batchItems.length

        logStore.info(
          `[${targetLang}] Total: ${totalInThisLang}, Should translate (actual): ${languageActualCounts[targetLang]}, Actually translated: ${batchItems.length}, Skipped: ${skippedCount}, Success: ${successCount}, Failed: ${errorCount}`
        )
      }

      if (!hasAnyBatchItems) {
        if (finalizeState) {
          toast.warning(t('workbench.toast.noTranslatableItems'))
          state.value = TranslationState.COMPLETED
          logStore.info('Batch translation completed (no items)')
          _progressFilesCompleted.value += 1
          currentFileName.value = null
          currentResDir.value = null
        }
        return
      }

      if (isCancelled.value) {
        logStore.info('Batch translation stopped by user')
        state.value = TranslationState.IDLE
        currentTaskIndex.value = 0
        currentFileName.value = null
        currentResDir.value = null
        return
      }

      if (finalizeState) {
        state.value = TranslationState.COMPLETED
        logStore.info(
          `Batch translation completed. Display progress: ${_progressCompleted.value}/${_progressTotalDisplay.value} (${progress.value.percentage}%), failed: ${_progressFailed.value}. Actual total: ${_progressTotal.value}`
        )
        try {
          projectStore.dataVersion++
          logStore.debug('UI refresh triggered after batch translation (dataVersion++)')
          _progressFilesCompleted.value += 1
        } catch {}
      } else if (bumpDataVersion) {
        try {
          projectStore.dataVersion++
          logStore.debug(
            `UI refresh triggered after batch translation for ${fileName} (dataVersion++)`
          )
        } catch {}
        _progressFilesCompleted.value += 1
      }
      currentFileName.value = null
      currentResDir.value = null
    } catch (err: any) {
      if (state.value === TranslationState.STOPPING || isCancelled.value) {
        logStore.info('Batch translation stopped by user')
        state.value = TranslationState.IDLE
        currentFileName.value = null
        currentResDir.value = null
        return
      }

      logStore.error('Batch translation failed', err)
      error.value = err.message || 'Unknown error'
      if (finalizeState) {
        state.value = TranslationState.ERROR
      }
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

    await batchTranslateForFile({
      xmlData: projectStore.selectedXmlData as XmlData,
      fileName: projectStore.selectedXmlFile!,
      items,
      languages,
      autoUpdateTranslated,
      fileMap,
      resetProgress: true,
      finalizeState: true,
      bumpDataVersion: true,
      reuseCancelToken: false,
    })
  }

  /**
   * 项目级批量翻译：遍历项目的所有 res 目录与 XML 文件
   */
  async function translateProject(options: {
    languages: Language[]
    autoUpdateTranslated?: boolean
    scope?: 'all' | 'current'
  }): Promise<void> {
    const { languages, autoUpdateTranslated = false, scope = 'all' } = options
    if (!languages?.length) {
      throw new Error('No target languages provided')
    }
    if (!projectStore.project) {
      throw new Error('No project opened')
    }

    const resTargets =
      scope === 'current' && projectStore.selectedResDir
        ? [projectStore.selectedResDir]
        : projectStore.project.resDirs.map(d => d.relativePath)

    initTranslator()
    translator.value?.createCancelToken()
    tasks.value = []
    targetLanguages.value = languages
    error.value = null
    isCancelled.value = false
    _progressTotal.value = 0
    _progressTotalDisplay.value = 0
    _progressCompleted.value = 0
    _progressFailed.value = 0
    _progressFilesCompleted.value = 0
    state.value = TranslationState.TRANSLATING

    let totalFiles = 0
    let translatedFiles = 0

    // 预先统计 scope 内的文件数
    for (const resPath of resTargets) {
      const xmlData = projectStore.project.xmlDataMap.get(resPath) as XmlData | undefined
      if (!xmlData) continue
      totalFiles += xmlData.getXmlFileNames().length
    }
    _progressFilesTotal.value = totalFiles

    try {
      for (const resPath of resTargets) {
        if (isCancelled.value) break
        const xmlData = projectStore.project.xmlDataMap.get(resPath) as XmlData | undefined
        if (!xmlData) continue

        const fileNames = xmlData.getXmlFileNames()

        projectStore.selectResDir(resPath)
        currentResDir.value = resPath

        for (const fileName of fileNames) {
          if (isCancelled.value) {
            logStore.info('Project translation cancelled before next file')
            break
          }

          projectStore.selectXmlFile(fileName)
          currentFileName.value = fileName
          currentResDir.value = resPath
          try {
            await projectStore.loadSelectedFile()
          } catch (e) {
            logStore.warning(`Skip ${fileName}: failed to load file`, e)
            _progressFilesCompleted.value += 1
            currentFileName.value = null
            continue
          }

          const fileMap = xmlData.getFileData(fileName)
          const defData = fileMap?.get(LANGUAGE.DEF)
          if (!defData) {
            logStore.warning(`Skip ${fileName}: default language not available`)
            _progressFilesCompleted.value += 1
            currentFileName.value = null
            continue
          }

          const items = new Map<string, ResItem>()
          for (const [name, item] of defData.items) {
            if (!item.translatable) continue
            items.set(name, item)
          }

          if (items.size === 0) {
            logStore.info(`Skip ${fileName}: no translatable items`)
            _progressFilesCompleted.value += 1
            currentFileName.value = null
            continue
          }

          // 预估进度：按条目×语言计算，并根据是否覆盖已翻译过滤显示总量
          for (const lang of languages) {
            for (const [name] of items) {
              const value = fileMap?.get(lang)?.items.get(name)?.valueMap.get(lang)
              const missing =
                typeof value === 'string'
                  ? value.length === 0
                  : Array.isArray(value)
                    ? value.length === 0
                    : true
              _progressTotal.value += 1
              if (autoUpdateTranslated || missing) {
                _progressTotalDisplay.value += 1
              }
            }
          }

          logStore.info(`Translating file ${resPath}/${fileName} ...`)
          await batchTranslateForFile({
            xmlData,
            fileName,
            items,
            languages,
            autoUpdateTranslated,
            fileMap,
            resetProgress: false,
            finalizeState: false,
            bumpDataVersion: false,
            reuseCancelToken: true,
            resPath,
          })

          translatedFiles++
          try {
            projectStore.dataVersion++
            logStore.debug(`UI refresh after ${fileName} (project-level)`)
          } catch {}
        }
      }

      if (isCancelled.value) {
        state.value = TranslationState.IDLE
        logStore.info('Project translation stopped by user')
        currentFileName.value = null
        currentResDir.value = null
        return
      }

      currentFileName.value = null
      currentResDir.value = null
      state.value = TranslationState.COMPLETED
      logStore.info(
        `Project translation completed. Files: ${translatedFiles}/${totalFiles}, progress: ${_progressCompleted.value}/${_progressTotalDisplay.value} (failed: ${_progressFailed.value})`
      )
    } catch (err: any) {
      logStore.error('Project translation failed', err)
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
            sourceLanguage: configStore.config.defaultSourceLanguage || LANGUAGE.DEF,
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
                sourceLanguage: configStore.config.defaultSourceLanguage || LANGUAGE.DEF,
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
    interface ExportedTaskResult {
      itemName: string
      targetLanguage: string
      originalText: string | string[]
      translatedText: string | string[] | null | undefined
      status: string
      error: string | null | undefined
    }

    interface ExportedResults {
      timestamp: string
      progress: {
        total: number
        completed: number
        failed: number
        percentage: number
      }
      tasks: ExportedTaskResult[]
    }

    const results: ExportedResults = {
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
    projectProgress,
    currentTask,
    currentFileName,
    currentResDir,

    // 方法
    initTranslator,
    testConnection,
    startTranslation,
    batchTranslate,
    translateProject,
    async translateSingle(itemName: string, lang: Language): Promise<void> {
      if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) {
        throw new Error('No XML data selected')
      }
      initTranslator()
      const xml = projectStore.selectedXmlData
      const file = projectStore.selectedXmlFile
      const fileMap = xml.getFileData(file)
      if (!fileMap) throw new Error('Selected file not loaded')
      const defData = fileMap.get(LANGUAGE.DEF)
      if (!defData) throw new Error('Default language not available')
      const item = defData.items.get(itemName)
      if (!item) throw new Error('Item not found')
      const originalText = item.valueMap.get(LANGUAGE.DEF)
      if (!originalText || Array.isArray(originalText)) {
        throw new Error('Only single string items supported for quick translate')
      }
      if (!translator.value) throw new Error('Translator not initialized')
      const res = await translator.value.translate({
        text: originalText,
        targetLanguage: lang,
        sourceLanguage: configStore.config.defaultSourceLanguage || LANGUAGE.DEF,
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
