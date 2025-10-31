import type { StorageAdapter } from '../types'

/**
 * 浏览器 localStorage 适配器
 */
export class BrowserStorage implements StorageAdapter {
  private readonly prefix = 'android_trans_'

  async get<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (item === null) {
        return defaultValue !== undefined ? defaultValue : null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Failed to get item "${key}":`, error)
      return defaultValue !== undefined ? defaultValue : null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to set item "${key}":`, error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error(`Failed to remove item "${key}":`, error)
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
      console.error('Failed to clear storage:', error)
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
      console.error('Failed to get keys:', error)
      return []
    }
  }
}
