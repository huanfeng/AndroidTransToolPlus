import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getStorageAdapter } from '@/adapters'
import { Language, getAllLanguages } from '@/models/language'

/**
 * 应用配置接口
 */
export interface AppConfig {
  apiUrl: string
  apiToken: string
  httpProxy: string
  enabledLanguages: Language[]
  targetLanguages: Language[]
  maxItemsPerRequest: number
  autoRetry: boolean
  maxRetries: number
  requestTimeout: number
  theme: 'light' | 'dark'
  showLogView: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'https://api.openai.com/v1',
  apiToken: '',
  httpProxy: '',
  enabledLanguages: getAllLanguages(),
  targetLanguages: [],
  maxItemsPerRequest: 20,
  autoRetry: true,
  maxRetries: 3,
  requestTimeout: 120000,
  theme: 'light',
  showLogView: false,
}

/**
 * 配置 Store
 */
export const useConfigStore = defineStore('config', () => {
  // 状态
  const config = ref<AppConfig>({ ...DEFAULT_CONFIG })
  const loaded = ref(false)
  const loading = ref(false)

  // 加载配置
  async function load(): Promise<void> {
    loading.value = true
    try {
      const storage = getStorageAdapter()
      const saved = await storage.get<AppConfig>('app_config')
      if (saved) {
        config.value = { ...DEFAULT_CONFIG, ...saved }
      }
      loaded.value = true
      console.log('[Config] Configuration loaded')
    } catch (error) {
      console.error('[Config] Failed to load configuration:', error)
    } finally {
      loading.value = false
    }
  }

  // 保存配置
  async function save(): Promise<void> {
    try {
      const storage = getStorageAdapter()
      await storage.set('app_config', config.value)
      console.log('[Config] Configuration saved')
    } catch (error) {
      console.error('[Config] Failed to save configuration:', error)
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
  }

  // 验证配置
  function validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.value.apiUrl) {
      errors.push('API URL is required')
    }

    if (!config.value.apiToken) {
      errors.push('API Token is required')
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
  }
})
