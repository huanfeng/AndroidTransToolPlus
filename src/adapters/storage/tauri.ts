import type { StorageAdapter } from '../types'

/**
 * Tauri 存储适配器
 * 使用 localStorage 作为后备方案（Tauri 环境也支持 localStorage）
 */
export class TauriStorage implements StorageAdapter {
  private readonly prefix = 'android_trans_'

  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (item === null) {
        return defaultValue !== undefined ? defaultValue : null
      }
      return JSON.parse(item) as T
    } catch (error) {
      return defaultValue !== undefined ? defaultValue : null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys()
      for (const key of keys) {
        await this.remove(key)
      }
    } catch (error) {
      throw error
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length))
        }
      }
      return keys
    } catch (error) {
      return []
    }
  }
}
