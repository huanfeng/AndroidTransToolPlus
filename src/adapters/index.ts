import type { FileSystemAdapter, StorageAdapter } from './types'
import { isTauri } from './platform'

let fileSystemAdapter: FileSystemAdapter
let storageAdapter: StorageAdapter

/**
 * 初始化适配器
 * 根据当前环境自动选择合适的实现
 */
export async function initAdapters(): Promise<void> {
  if (isTauri()) {
    // Tauri 环境
    const { TauriFileSystem } = await import('./filesystem/tauri')
    const { TauriStorage } = await import('./storage/tauri')
    fileSystemAdapter = new TauriFileSystem()
    storageAdapter = new TauriStorage()
    console.log('[Platform] Initialized Tauri adapters')
  } else {
    // 浏览器环境
    const { BrowserFileSystem } = await import('./filesystem/browser')
    const { BrowserStorage } = await import('./storage/browser')
    fileSystemAdapter = new BrowserFileSystem()
    storageAdapter = new BrowserStorage()
    console.log('[Platform] Initialized Browser adapters')
  }
}

/**
 * 获取文件系统适配器
 */
export function getFileSystemAdapter(): FileSystemAdapter {
  if (!fileSystemAdapter) {
    throw new Error('Adapters not initialized. Call initAdapters() first.')
  }
  return fileSystemAdapter
}

/**
 * 获取存储适配器
 */
export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    throw new Error('Adapters not initialized. Call initAdapters() first.')
  }
  return storageAdapter
}

// 导出类型
export * from './types'
export { isTauri, getPlatformCapabilities } from './platform'
