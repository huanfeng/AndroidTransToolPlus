/**
 * 项目状态管理
 * 管理当前打开的 Android 项目
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DirectoryHandle } from '@/adapters/types'
import { getFileSystemAdapter } from '@/adapters'
import { scanProjectResDirs, type ResDirInfo } from '@/services/project/scanner'
import { XmlData } from '@/services/project/xmldata'
import { Language } from '@/models/language'
import { useLogStore } from './log'
import { loadProjectFromStorage, clearProjectFromStorage } from '@/utils/projectPersistence'

/**
 * 项目状态
 */
export enum ProjectState {
  IDLE = 'idle', // 空闲，未打开项目
  SCANNING = 'scanning', // 扫描中
  LOADING = 'loading', // 加载中
  LOADED = 'loaded', // 已加载
  ERROR = 'error', // 错误
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  name: string // 项目名称
  path: string // 项目路径（显示用）
  handle: DirectoryHandle // 项目目录句柄
  resDirs: ResDirInfo[] // res 目录列表
  xmlDataMap: Map<string, XmlData> // XmlData 映射（key 为 relativePath）
}

export const useProjectStore = defineStore('project', () => {
  const logStore = useLogStore()

  // 状态
  const state = ref<ProjectState>(ProjectState.IDLE)
  const project = ref<ProjectInfo | null>(null)
  const error = ref<string | null>(null)
  const selectedResDir = ref<string | null>(null) // 当前选中的 res 目录
  const selectedXmlFile = ref<string | null>(null) // 当前选中的 XML 文件
  const selectedItemNames = ref<string[]>([]) // 表格当前选中的条目名
  const dataVersion = ref(0) // 数据变更版本号（懒加载/重载后触发视图刷新）

  // 表格筛选/选择 UI 状态（供 OperationsBar 与 ResourceTable 共享）
  const tableFilterText = ref('')
  const tableFilterIncomplete = ref(false)
  const tableFilterUntranslatable = ref(false)
  const tableFilterEdited = ref(false)
  const tableFilteredCount = ref(0)
  const tableSelectionCount = ref(0)

  // 计算属性
  const isIdle = computed(() => state.value === ProjectState.IDLE)
  const isScanning = computed(() => state.value === ProjectState.SCANNING)
  const isLoading = computed(() => state.value === ProjectState.LOADING)
  const isLoaded = computed(() => state.value === ProjectState.LOADED)
  const hasError = computed(() => state.value === ProjectState.ERROR)
  const hasProject = computed(() => project.value !== null)

  /**
   * 获取当前选中的 XmlData
   */
  const selectedXmlData = computed(() => {
    if (!project.value || !selectedResDir.value) return null
    return project.value.xmlDataMap.get(selectedResDir.value) || null
  })

  /**
   * 获取项目统计信息
   */
  const projectStats = computed(() => {
    if (!project.value) {
      return {
        totalResDirs: 0,
        totalFiles: 0,
        totalItems: 0,
      }
    }

    let totalFiles = 0
    let totalItems = 0

    for (const xmlData of project.value.xmlDataMap.values()) {
      const stats = xmlData.getStats()
      totalFiles += stats.totalFiles
      totalItems += stats.totalItems
    }

    return {
      totalResDirs: project.value.resDirs.length,
      totalFiles,
      totalItems,
    }
  })

  /**
   * 打开项目
   */
  async function openProject(): Promise<boolean> {
    try {
      logStore.info('Opening project...')
      const fs = getFileSystemAdapter()

      // 选择项目目录
      const dirHandle = await fs.selectDirectory()
      if (!dirHandle) {
        logStore.info('Project selection cancelled')
        return false
      }

      logStore.info(`Selected directory: ${dirHandle.name}`)

      // 扫描项目
      await scanProject(dirHandle)

      return true
    } catch (err: any) {
      logStore.error('Failed to open project', err)
      error.value = err.message || 'Unknown error'
      state.value = ProjectState.ERROR
      return false
    }
  }

  /**
   * 扫描项目
   */
  async function scanProject(dirHandle: DirectoryHandle): Promise<void> {
    state.value = ProjectState.SCANNING
    error.value = null

    try {
      logStore.info('Scanning project for res directories...')

      // 扫描 res 目录
      const resDirs = await scanProjectResDirs(dirHandle)

      if (resDirs.length === 0) {
        throw new Error('No res directories found in project')
      }

      logStore.info(`Found ${resDirs.length} res director${resDirs.length > 1 ? 'ies' : 'y'}`)

      // 创建项目信息
      project.value = {
        name: dirHandle.name,
        path: dirHandle.name, // 浏览器环境下只能显示目录名
        handle: dirHandle,
        resDirs,
        xmlDataMap: new Map(),
      }

      // 创建 XmlData 实例
      for (const resDir of resDirs) {
        const xmlData = new XmlData(
          resDir.dirHandle,
          resDir.relativePath,
          resDir.xmlFileNames
        )
        project.value.xmlDataMap.set(resDir.relativePath, xmlData)
      }

      // 自动选中第一个 res 目录
      if (resDirs.length > 0) {
        selectedResDir.value = resDirs[0].relativePath
      }

      state.value = ProjectState.LOADED
      logStore.info('Project scanned successfully')
    } catch (err: any) {
      logStore.error('Failed to scan project', err)
      error.value = err.message || 'Failed to scan project'
      state.value = ProjectState.ERROR
      throw err
    }
  }

  /**
   * 加载项目数据
   */
  async function loadProject(): Promise<void> {
    if (!project.value) {
      throw new Error('No project opened')
    }

    state.value = ProjectState.LOADING
    error.value = null

    try {
      logStore.info('Loading project data...')

      // 懒加载策略：打开项目时不加载内容，仅扫描目录和文件列表

      logStore.info('Project ready (lazy loading enabled)')

      state.value = ProjectState.LOADED
    } catch (err: any) {
      logStore.error('Failed to load project', err)
      error.value = err.message || 'Failed to load project'
      state.value = ProjectState.ERROR
      throw err
    }
  }

  /**
   * 加载指定的 res 目录
   */
  async function loadResDir(relativePath: string): Promise<void> {
    if (!project.value) {
      throw new Error('No project opened')
    }

    const xmlData = project.value.xmlDataMap.get(relativePath)
    if (!xmlData) {
      throw new Error(`ResDir not found: ${relativePath}`)
    }

    try {
      // 目录级加载取消，保留方法以兼容旧调用
      logStore.info(`Skip eager loading for ${relativePath} (lazy mode)`)
    } catch (err: any) {
      logStore.error(`Failed to load ${relativePath}`, err)
      throw err
    }
  }

  /**
   * 按需加载当前选中的 XML 文件
   */
  async function loadSelectedFile(): Promise<void> {
    if (!selectedXmlData.value || !selectedXmlFile.value) {
      throw new Error('No file selected')
    }
    const xml = selectedXmlData.value
    const file = selectedXmlFile.value
    const exists = xml.getFileData(file)
    if (exists) return
    await xml.loadFile(file)
    dataVersion.value++
  }

  /**
   * 保存项目数据
   */
  async function saveProject(): Promise<void> {
    if (!project.value) {
      throw new Error('No project opened')
    }

    try {
      logStore.info('Saving project...')

      const errors: string[] = []

      // 保存所有 XmlData
      for (const [relativePath, xmlData] of project.value.xmlDataMap) {
        try {
          logStore.debug(`Saving ${relativePath}...`)
          await xmlData.saveAll()
        } catch (err: any) {
          const errMsg = `Failed to save ${relativePath}: ${err.message}`
          logStore.error(errMsg)
          errors.push(errMsg)
        }
      }

      if (errors.length > 0) {
        throw new Error(`Saved with ${errors.length} error(s):\n${errors.join('\n')}`)
      }

      logStore.info('Project saved successfully')
    } catch (err: any) {
      logStore.error('Failed to save project', err)
      throw err
    }
  }

  /**
   * 保存指定的 res 目录
   */
  async function saveResDir(relativePath: string): Promise<void> {
    if (!project.value) {
      throw new Error('No project opened')
    }

    const xmlData = project.value.xmlDataMap.get(relativePath)
    if (!xmlData) {
      throw new Error(`ResDir not found: ${relativePath}`)
    }

    try {
      logStore.info(`Saving ${relativePath}...`)
      await xmlData.saveAll()
      logStore.info(`Saved ${relativePath}`)
    } catch (err: any) {
      logStore.error(`Failed to save ${relativePath}`, err)
      throw err
    }
  }

  /**
   * 仅保存当前选中的 XML 文件（只保存有修改的语言）
   */
  async function saveSelectedFile(): Promise<void> {
    if (!selectedXmlData.value || !selectedXmlFile.value) {
      throw new Error('No file selected')
    }
    const fileName = selectedXmlFile.value
    const xml = selectedXmlData.value
    const dataMap = xml.getFileData(fileName)
    if (!dataMap) return

    const languages = Array.from(dataMap.keys())
    const errors: Array<{ language: Language; error: any }> = []
    for (const lang of languages) {
      try {
        if (xml.hasDirty(fileName, lang)) {
          await xml.saveFile(fileName, lang)
        }
      } catch (e) {
        errors.push({ language: lang, error: e })
      }
    }
    if (errors.length > 0) {
      throw new Error(`Failed to save ${fileName}: ${errors.map(e => String(e.language)).join(', ')}`)
    }
  }

  /**
   * 关闭项目
   */
  function closeProject(): void {
    logStore.info('Closing project...')
    project.value = null
    selectedResDir.value = null
    selectedXmlFile.value = null
    state.value = ProjectState.IDLE
    error.value = null
    // 清除持久化的项目信息
    clearProjectFromStorage()
    logStore.info('Project closed')
  }

  /**
   * 恢复项目（从本地存储）
   */
  async function restoreProject(): Promise<boolean> {
    const stored = loadProjectFromStorage()
    if (!stored) {
      logStore.info('No stored project to restore')
      return false
    }

    try {
      logStore.info(`Attempting to restore project: ${stored.name}`)

      // 注意：浏览器环境下的 File System Access API 无法持久化目录句柄
      // 用户需要重新选择目录，但我们可以记住选择的文件和目录
      logStore.warning('Please re-select the project directory to restore')

      const fs = getFileSystemAdapter()

      // 提示用户手动选择项目
      const dirHandle = await fs.selectDirectory()
      if (!dirHandle) {
        logStore.info('Project restoration cancelled')
        clearProjectFromStorage()
        return false
      }

      // 验证目录名称是否匹配（简单验证）
      if (dirHandle.name !== stored.name) {
        logStore.warning(`Directory name mismatch: expected ${stored.name}, got ${dirHandle.name}`)
        const confirm = window.confirm(
          `目录名称不匹配。\n期望: ${stored.name}\n实际: ${dirHandle.name}\n\n是否继续打开？`
        )
        if (!confirm) {
          return false
        }
      }

      // 扫描项目
      await scanProject(dirHandle)

      // 恢复选择的文件
      if (stored.selectedResDir && project.value) {
        const hasResDir = project.value.resDirs.some(d => d.relativePath === stored.selectedResDir)
        if (hasResDir) {
          selectedResDir.value = stored.selectedResDir

          // 自动加载选中的文件
          if (stored.selectedXmlFile) {
            const xmlData = project.value.xmlDataMap.get(selectedResDir.value)
            if (xmlData) {
              const fileNames = xmlData.getXmlFileNames()
              if (fileNames.includes(stored.selectedXmlFile)) {
                selectedXmlFile.value = stored.selectedXmlFile
                // 加载文件内容
                await loadSelectedFile()
              }
            }
          }
        }
      }

      logStore.info('Project restored successfully')
      return true
    } catch (err: any) {
      logStore.error('Failed to restore project', err)
      clearProjectFromStorage()
      return false
    }
  }

  /**
   * 选择 res 目录
   */
  function selectResDir(relativePath: string): void {
    if (!project.value) return

    const xmlData = project.value.xmlDataMap.get(relativePath)
    if (!xmlData) {
      logStore.warning(`ResDir not found: ${relativePath}`)
      return
    }

    selectedResDir.value = relativePath
    selectedXmlFile.value = null
    logStore.debug(`Selected res dir: ${relativePath}`)
  }

  /**
   * 选择 XML 文件
   */
  function selectXmlFile(fileName: string): void {
    if (!selectedXmlData.value) return

    const fileNames = selectedXmlData.value.getXmlFileNames()
    if (!fileNames.includes(fileName)) {
      logStore.warning(`XML file not found: ${fileName}`)
      return
    }

    selectedXmlFile.value = fileName
    selectedItemNames.value = []

    logStore.debug(`Selected XML file: ${fileName}`)
  }

  /** 更新表格选中项 */
  function updateSelectedItems(names: string[]): void {
    selectedItemNames.value = names
  }

  /**
   * 重新加载当前选中的 XML 文件
   */
  async function reloadSelectedFile(): Promise<void> {
    if (!selectedXmlData.value || !selectedXmlFile.value) {
      throw new Error('No file selected')
    }

    try {
      logStore.info(`Reloading ${selectedXmlFile.value}...`)
      await selectedXmlData.value.reloadFile(selectedXmlFile.value)
      dataVersion.value++
      logStore.info(`Reloaded ${selectedXmlFile.value}`)
    } catch (err: any) {
      logStore.error(`Failed to reload ${selectedXmlFile.value}`, err)
      throw err
    }
  }

  /**
   * 获取选中文件的统计信息
   */
  const selectedFileStats = computed(() => {
    if (!selectedXmlData.value) return null
    return selectedXmlData.value.getStats()
  })

  return {
    // 状态
    state,
    project,
    error,
    selectedResDir,
    selectedXmlFile,
    selectedItemNames,

    // 计算属性
    isIdle,
    isScanning,
    isLoading,
    isLoaded,
    hasError,
    hasProject,
    selectedXmlData,
    dataVersion,
    projectStats,
    selectedFileStats,

    // 表格筛选/选择状态
    tableFilterText,
    tableFilterIncomplete,
    tableFilterUntranslatable,
    tableFilterEdited,
    tableFilteredCount,
    tableSelectionCount,

    // 方法
    openProject,
    scanProject,
    restoreProject,
    loadProject,
    loadResDir,
    saveProject,
    saveResDir,
    saveSelectedFile,
    loadSelectedFile,
    closeProject,
    selectResDir,
    selectXmlFile,
    updateSelectedItems,
    reloadSelectedFile,
  }
})
