/**
 * 项目持久化工具
 * 负责保存和恢复项目状态
 */

/**
 * 存储的项目信息
 */
export interface StoredProjectInfo {
  name: string // 项目名称
  path: string // 项目路径（显示用）
  selectedResDir: string | null // 选中的 res 目录
  selectedXmlFile: string | null // 选中的 XML 文件
  timestamp: number // 保存时间戳
}

/**
 * 存储键名
 */
const STORAGE_KEY = 'android_trans_tool_project'

/**
 * 保存项目信息到 localStorage
 */
export function saveProjectToStorage(info: StoredProjectInfo): void {
  try {
    const data = {
      ...info,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('Failed to save project to storage:', err)
  }
}

/**
 * 从 localStorage 读取项目信息
 */
export function loadProjectFromStorage(): StoredProjectInfo | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data) as StoredProjectInfo

    // 检查数据是否过期（30天）
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - parsed.timestamp > THIRTY_DAYS) {
      clearProjectFromStorage()
      return null
    }

    return parsed
  } catch (err) {
    console.warn('Failed to load project from storage:', err)
    return null
  }
}

/**
 * 清除存储的项目信息
 */
export function clearProjectFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('Failed to clear project from storage:', err)
  }
}

/**
 * 检查是否有存储的项目信息
 */
export function hasStoredProject(): boolean {
  return loadProjectFromStorage() !== null
}
