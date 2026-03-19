import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useConfigStore } from './config'
import { useProjectStore } from './project'
import { LANGUAGE, type Language } from '@/models/language'
import {
  PROJECT_PRESET_ID,
  MAX_PRESETS,
  type LanguagePreset,
  type ProjectPresetConfig,
  type PresetFileFormat,
  validatePresetFile,
  parsePresetLanguages,
  generatePresetId,
  uniquePresetName,
  serializePreset,
} from '@/models/preset'
import { getFileSystemAdapter } from '@/adapters'
import toast from '@/utils/toast'

export const usePresetStore = defineStore('preset', () => {
  const configStore = useConfigStore()
  const projectStore = useProjectStore()

  // ===== 项目配置运行时状态（不持久化） =====
  const projectConfig = ref<ProjectPresetConfig | null>(null)

  // ===== 计算属性 =====

  /** 所有方案列表 */
  const presets = computed(() => configStore.config.presets)

  /** 当前激活的方案 ID */
  const activePresetId = computed(() => configStore.config.activePresetId)

  /** 是否处于项目配置模式 */
  const isProjectPresetActive = computed(
    () => activePresetId.value === PROJECT_PRESET_ID && projectConfig.value !== null
  )

  /** 当前激活的方案对象（非项目配置时） */
  const activePreset = computed(() => {
    if (!activePresetId.value || activePresetId.value === PROJECT_PRESET_ID) return null
    return presets.value.find(p => p.id === activePresetId.value) ?? null
  })

  /**
   * 核心计算属性：当前有效的启用语言列表
   * 优先级：项目配置 > 选中方案 > 默认配置
   */
  const effectiveEnabledLanguages = computed<Language[]>(() => {
    if (isProjectPresetActive.value && projectConfig.value) {
      return projectConfig.value.enabledLanguages
    }
    if (activePreset.value) {
      return activePreset.value.enabledLanguages
    }
    return configStore.config.enabledLanguages
  })

  /** 不含 DEF 的目标语言列表（供翻译业务使用） */
  const effectiveTargetLanguages = computed(() =>
    effectiveEnabledLanguages.value.filter(l => l !== LANGUAGE.DEF)
  )

  /** 是否有项目配置文件可用 */
  const hasProjectConfig = computed(() => projectConfig.value !== null)

  /** 项目配置是否有未保存修改 */
  const isProjectConfigDirty = computed(() => projectConfig.value?.dirty ?? false)

  // ===== 方案 CRUD =====

  function createPreset(name: string, languages?: Language[]): LanguagePreset {
    if (presets.value.length >= MAX_PRESETS) {
      throw new Error(`Maximum ${MAX_PRESETS} presets allowed`)
    }
    const existingNames = presets.value.map(p => p.name)
    const safeName = uniquePresetName(name, existingNames)
    const now = Date.now()
    const preset: LanguagePreset = {
      id: generatePresetId(),
      name: safeName,
      enabledLanguages: languages ?? [...effectiveEnabledLanguages.value],
      createdAt: now,
      updatedAt: now,
    }
    configStore.config.presets = [...presets.value, preset]
    return preset
  }

  function renamePreset(id: string, newName: string): boolean {
    const idx = presets.value.findIndex(p => p.id === id)
    if (idx < 0) return false
    const otherNames = presets.value.filter(p => p.id !== id).map(p => p.name)
    if (otherNames.includes(newName)) {
      throw new Error(`Preset name "${newName}" already exists`)
    }
    const updated = { ...presets.value[idx], name: newName, updatedAt: Date.now() }
    const list = [...presets.value]
    list[idx] = updated
    configStore.config.presets = list
    return true
  }

  function deletePreset(id: string): boolean {
    if (id === PROJECT_PRESET_ID) return false
    const idx = presets.value.findIndex(p => p.id === id)
    if (idx < 0) return false
    configStore.config.presets = presets.value.filter(p => p.id !== id)
    if (activePresetId.value === id) {
      configStore.config.activePresetId = null
    }
    return true
  }

  function updatePresetLanguages(id: string, languages: Language[]): boolean {
    const idx = presets.value.findIndex(p => p.id === id)
    if (idx < 0) return false
    const updated = { ...presets.value[idx], enabledLanguages: languages, updatedAt: Date.now() }
    const list = [...presets.value]
    list[idx] = updated
    configStore.config.presets = list
    return true
  }

  // ===== 方案切换 =====

  function switchPreset(id: string | null): void {
    if (id === PROJECT_PRESET_ID && !projectConfig.value) return
    configStore.config.activePresetId = id

    // 非项目配置模式时，同步到 config.enabledLanguages
    if (id !== PROJECT_PRESET_ID) {
      const preset = presets.value.find(p => p.id === id)
      if (preset) {
        configStore.config.enabledLanguages = [...preset.enabledLanguages]
      }
    }
  }

  // ===== 项目配置管理 =====

  async function loadProjectConfigWithUnknownCheck(): Promise<{
    loaded: boolean
    unknownLanguages: string[]
  }> {
    const project = projectStore.project
    if (!project?.handle) return { loaded: false, unknownLanguages: [] }

    try {
      const fs = getFileSystemAdapter()
      const exists = await fs.exists(project.handle, '.trans-tool.json')
      if (!exists) {
        projectConfig.value = null
        return { loaded: false, unknownLanguages: [] }
      }

      const fileHandle = await project.handle.getFileHandle('.trans-tool.json')
      const content = await fs.readFile(fileHandle)
      const data = JSON.parse(content) as unknown

      const errors = validatePresetFile(data)
      if (errors.length > 0) {
        toast.error(`项目配置文件格式错误: ${errors[0]}`)
        projectConfig.value = null
        return { loaded: false, unknownLanguages: [] }
      }

      const fileData = data as PresetFileFormat
      const { known, unknown } = parsePresetLanguages(fileData.enabledLanguages)

      projectConfig.value = {
        name: fileData.name || project.name,
        enabledLanguages: known,
        dirHandle: project.handle,
        dirty: false,
      }

      configStore.config.activePresetId = PROJECT_PRESET_ID

      return { loaded: true, unknownLanguages: unknown }
    } catch (err: any) {
      console.error('Failed to load .trans-tool.json:', err)
      projectConfig.value = null
      return { loaded: false, unknownLanguages: [] }
    }
  }

  async function saveProjectConfig(): Promise<void> {
    if (!projectConfig.value) {
      throw new Error('No project config loaded')
    }

    const dirHandle = projectConfig.value.dirHandle
    const fs = getFileSystemAdapter()
    const content = serializePreset({
      name: projectConfig.value.name,
      enabledLanguages: projectConfig.value.enabledLanguages,
    })

    await fs.createFile(dirHandle, '.trans-tool.json', content)
    projectConfig.value.dirty = false
  }

  async function createProjectConfig(name?: string): Promise<void> {
    const project = projectStore.project
    if (!project?.handle) {
      throw new Error('No project opened')
    }

    const configName = name || project.name
    const languages = [...effectiveEnabledLanguages.value]

    projectConfig.value = {
      name: configName,
      enabledLanguages: languages,
      dirHandle: project.handle,
      dirty: false,
    }

    await saveProjectConfig()
    configStore.config.activePresetId = PROJECT_PRESET_ID
  }

  function updateProjectConfigLanguages(languages: Language[]): void {
    if (!projectConfig.value) return
    projectConfig.value.enabledLanguages = languages
    projectConfig.value.dirty = true
  }

  function clearProjectConfig(): void {
    projectConfig.value = null
    if (activePresetId.value === PROJECT_PRESET_ID) {
      configStore.config.activePresetId = null
    }
  }

  // ===== 导入导出 =====

  function exportPreset(id: string): void {
    let name: string
    let languages: Language[]

    if (id === PROJECT_PRESET_ID && projectConfig.value) {
      name = projectConfig.value.name
      languages = projectConfig.value.enabledLanguages
    } else {
      const preset = presets.value.find(p => p.id === id)
      if (!preset) throw new Error('Preset not found')
      name = preset.name
      languages = preset.enabledLanguages
    }

    const content = serializePreset({ name, enabledLanguages: languages })
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 解析导入文件内容（不创建方案），供 UI 层判断是否有同名冲突
   */
  async function parseImportFile(file: File): Promise<{
    name: string
    languages: Language[]
    unknownLanguages: string[]
  }> {
    const text = await file.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Invalid JSON file')
    }

    const errors = validatePresetFile(data)
    if (errors.length > 0) {
      throw new Error(errors[0])
    }

    const fileData = data as PresetFileFormat
    const name = fileData.name || file.name.replace(/\.json$/i, '')
    const { known, unknown } = parsePresetLanguages(fileData.enabledLanguages)

    return { name, languages: known, unknownLanguages: unknown }
  }

  async function importPreset(file: File): Promise<{
    preset: LanguagePreset
    unknownLanguages: string[]
  }> {
    const { name, languages, unknownLanguages } = await parseImportFile(file)
    const preset = createPreset(name, languages)
    return { preset, unknownLanguages }
  }

  // ===== 监听项目变化 =====

  watch(
    () => projectStore.project,
    async (newProject, oldProject) => {
      if (newProject && newProject !== oldProject) {
        const result = await loadProjectConfigWithUnknownCheck()
        if (result.loaded) {
          toast.success('已加载项目配置')
        }
      } else if (!newProject) {
        clearProjectConfig()
      }
    }
  )

  // ===== 初始化：清理无效的 __project__ 状态 =====
  // 页面刷新后 activePresetId 从 localStorage 恢复为 __project__，
  // 但项目配置（内存状态）已丢失，需要在 config 加载完成后重置
  watch(
    () => configStore.loaded,
    (loaded) => {
      if (loaded && configStore.config.activePresetId === PROJECT_PRESET_ID && !projectConfig.value) {
        configStore.config.activePresetId = null
      }
    },
    { immediate: true }
  )

  return {
    // 状态
    projectConfig,
    // 计算属性
    presets,
    activePresetId,
    isProjectPresetActive,
    activePreset,
    effectiveEnabledLanguages,
    effectiveTargetLanguages,
    hasProjectConfig,
    isProjectConfigDirty,
    // 方案 CRUD
    createPreset,
    renamePreset,
    deletePreset,
    updatePresetLanguages,
    // 方案切换
    switchPreset,
    // 项目配置
    loadProjectConfigWithUnknownCheck,
    saveProjectConfig,
    createProjectConfig,
    updateProjectConfigLanguages,
    clearProjectConfig,
    // 导入导出
    exportPreset,
    importPreset,
    parseImportFile,
  }
})
