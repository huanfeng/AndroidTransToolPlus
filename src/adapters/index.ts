import type { FileSystemAdapter, StorageAdapter } from './types'

let fileSystemAdapter: FileSystemAdapter
let storageAdapter: StorageAdapter

/**
 * 初始化适配器
 * 使用浏览器环境的实现
 */
export async function initAdapters(): Promise<void> {
  const { BrowserFileSystem } = await import('./filesystem/browser')
  const { BrowserStorage } = await import('./storage/browser')
  fileSystemAdapter = new BrowserFileSystem()
  storageAdapter = new BrowserStorage()
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
export { getPlatformCapabilities } from './platform'
