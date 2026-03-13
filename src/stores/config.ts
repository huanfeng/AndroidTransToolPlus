import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getStorageAdapter } from '@/adapters'
import {
  LANGUAGE,
  type Language,
  getBuiltinLanguages,
  LanguageManager,
  type CustomLanguage,
} from '@/models/language'
import { DEFAULT_AI_MODEL_PRESET } from '@/models/ai'
import { setLocale, type LocaleType } from '@/locales'

/**
 * 应用配置接口
 */
export interface AppConfig {
  apiUrl: string
  apiKey: string
  httpProxy: string
  defaultSourceLanguage: Language // values 目录对应的源语言
  enabledLanguages: Language[]
  targetLanguages: Language[]
  customLanguages: CustomLanguage[]
  maxItemsPerRequest: number
  autoUpdateTranslated: boolean
  maxRetries: number
  requestTimeout: number
  theme: 'light' | 'dark'
  locale: LocaleType
  showLogView: boolean
  aiModelPreset: string
  aiCustomModel: string
  aiPromptExtra: string
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  apiUrl: '',
  apiKey: '',
  httpProxy: '',
  defaultSourceLanguage: LANGUAGE.DEF, // 默认为内置的 'def' (英文)
  enabledLanguages: getBuiltinLanguages(),
  targetLanguages: [],
  customLanguages: [],
  maxItemsPerRequest: 20,
  autoUpdateTranslated: false,
  maxRetries: 3,
  requestTimeout: 120000,
  theme: 'light',
  locale: 'zh-CN',
  showLogView: false,
  aiModelPreset: DEFAULT_AI_MODEL_PRESET,
  aiCustomModel: '',
  aiPromptExtra: '',
}

/**
 * 配置 Store
 */
export const useConfigStore = defineStore('config', () => {
  // 状态
  const config = ref<AppConfig>({ ...DEFAULT_CONFIG })
  const loaded = ref(false)
  const loading = ref(false)

  function syncLanguageManager(): LanguageManager {
    const langManager = LanguageManager.getInstance()
    langManager.setCustomLanguages(config.value.customLanguages)
    return langManager
  }

  // 加载配置
  async function load(): Promise<void> {
    loading.value = true
    try {
      const storage = getStorageAdapter()
      const saved = await storage.get<AppConfig>('app_config')
      if (saved) {
        config.value = { ...DEFAULT_CONFIG, ...saved }
      }

      // 初始化语言管理器中的自定义语言
      syncLanguageManager()

      // 同步 UI 语言到 i18n
      setLocale(config.value.locale)

      loaded.value = true
    } catch (error) {
      // 错误已在 storage adapter 中记录
    } finally {
      loading.value = false
    }
  }

  // 保存配置
  async function save(): Promise<void> {
    try {
      const storage = getStorageAdapter()
      await storage.set('app_config', config.value)
    } catch (error) {
      // 错误已在 storage adapter 中记录
      throw error
    }
  }

  // 自动保存（配置变化时）
  watch(
    config,
    () => {
      if (loaded.value) {
        save()
      }
    },
    { deep: true }
  )

  // 更新单个配置项
  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    config.value[key] = value
  }

  // 批量更新配置
  function updateBatch(updates: Partial<AppConfig>): void {
    config.value = { ...config.value, ...updates }
  }

  // 重置配置
  function reset(): void {
    config.value = { ...DEFAULT_CONFIG }
    // 同时清空语言管理器的自定义语言
    syncLanguageManager()
  }

  // 添加自定义语言
  function addCustomLanguage(lang: CustomLanguage): void {
    const langManager = syncLanguageManager()
    langManager.addCustomLanguage(lang)
    config.value.customLanguages = langManager.getCustomLanguages()
    if (!config.value.enabledLanguages.includes(lang.androidCode)) {
      config.value.enabledLanguages = [...config.value.enabledLanguages, lang.androidCode]
    }
  }

  // 删除自定义语言
  function removeCustomLanguage(androidCode: string): boolean {
    const langManager = syncLanguageManager()
    const success = langManager.removeCustomLanguage(androidCode)
    if (success) {
      config.value.customLanguages = langManager.getCustomLanguages()
      // 清理已启用/目标语言中的残留项
      config.value.enabledLanguages = config.value.enabledLanguages.filter(
        l => l === LANGUAGE.DEF || l !== androidCode
      )
      config.value.targetLanguages = config.value.targetLanguages.filter(l => l !== androidCode)
    }
    return success
  }

  // 更新自定义语言
  function updateCustomLanguage(
    androidCode: string,
    updates: { nameCn?: string; nameEn?: string; valuesDirName?: string }
  ): boolean {
    const langManager = syncLanguageManager()
    const success = langManager.updateCustomLanguage(androidCode, updates)
    if (success) {
      config.value.customLanguages = langManager.getCustomLanguages()
    }
    return success
  }

  // 获取所有语言（默认 + 自定义）
  function getAllAvailableLanguages() {
    const langManager = syncLanguageManager()
    return langManager.getAllLanguages()
  }

  // 验证配置
  function validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.value.apiUrl) {
      errors.push('API URL is required')
    }

    if (!config.value.apiKey) {
      errors.push('API Key is required')
    }

    if (config.value.maxItemsPerRequest < 1 || config.value.maxItemsPerRequest > 100) {
      errors.push('Max items per request must be between 1 and 100')
    }

    if (config.value.requestTimeout < 1000 || config.value.requestTimeout > 300000) {
      errors.push('Request timeout must be between 1s and 300s')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  return {
    // 状态
    config,
    loaded,
    loading,
    // 方法
    load,
    save,
    update,
    updateBatch,
    reset,
    validate,
    addCustomLanguage,
    removeCustomLanguage,
    updateCustomLanguage,
    getAllAvailableLanguages,
  }
})
