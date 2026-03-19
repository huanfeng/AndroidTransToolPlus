# 语言方案管理 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持多套语言方案（Preset）和项目配置文件（`.trans-tool.json`），实现快速切换、导入导出和项目级独立配置。

**Architecture:** 新增 `preset store` 作为方案管理核心，对外暴露 `effectiveEnabledLanguages` 计算属性替代直接读取 `config.enabledLanguages`。项目配置通过监听 `projectStore.project` 变化自动检测加载。UI 方面在主界面 Header 增加方案选择器，在设置对话框 Language 标签页集成方案管理组件。

**Tech Stack:** Vue 3, Pinia, Element Plus, TypeScript, File System Access API

**Spec:** `docs/superpowers/specs/2026-03-18-language-preset-design.md`

---

## 文件结构

### 新增文件
| 文件 | 职责 |
|------|------|
| `src/models/preset.ts` | 方案数据模型、文件格式接口、校验/转换工具函数 |
| `src/stores/preset.ts` | 方案管理 store：CRUD、切换、导入导出、项目配置读写、`effectiveEnabledLanguages` |
| `src/components/settings/PresetManager.vue` | 设置对话框内的方案管理区域组件 |
| `src/components/common/PresetSelector.vue` | 主界面 Header 中的方案快速切换下拉框 |

### 修改文件
| 文件 | 修改内容 |
|------|----------|
| `src/stores/config.ts` | `AppConfig` 新增 `presets`、`activePresetId` 字段及默认值 |
| `src/models/language.ts` | 导出 `isKnownLanguageCode()` 辅助校验函数 |
| `src/components/layout/AppHeader.vue` | 集成 `PresetSelector` 组件 |
| `src/components/settings/SettingsDialog.vue` | 集成 `PresetManager` 组件到 Language 标签页顶部 |
| `src/components/workbench/ResourceTable.vue` | 改用 `presetStore.effectiveEnabledLanguages` |
| `src/components/workbench/OperationsBar.vue` | 改用 `presetStore.effectiveEnabledLanguages` |
| `src/components/workbench/TranslateConfigDialog.vue` | 改用 `presetStore.effectiveEnabledLanguages` |
| `src/locales/zh-CN.ts` | 新增方案管理相关中文文案 |
| `src/locales/en.ts` | 新增方案管理相关英文文案 |

---

## Task 1: 数据模型与校验函数

**Files:**
- Create: `src/models/preset.ts`
- Modify: `src/models/language.ts`

- [ ] **Step 1: 在 `language.ts` 中新增 `isKnownLanguageCode()` 函数**

在 `src/models/language.ts` 文件末尾（`LanguageManager` 类之后）添加：

```typescript
/**
 * 检查语言代码是否为已知语言（内置或自定义）
 */
export function isKnownLanguageCode(code: string): boolean {
  if (BUILTIN_LANGUAGES[code]) return true
  return LanguageManager.getInstance().getLanguageInfoByCode(code) !== null
}
```

- [ ] **Step 2: 创建 `src/models/preset.ts`**

```typescript
import type { Language } from './language'
import { isKnownLanguageCode } from './language'

/** 方案配置文件版本 */
export const PRESET_FILE_VERSION = 1

/** 项目配置的特殊方案 ID */
export const PROJECT_PRESET_ID = '__project__'

/** 方案最大数量 */
export const MAX_PRESETS = 50

/**
 * 语言方案
 */
export interface LanguagePreset {
  id: string
  name: string
  enabledLanguages: Language[]
  createdAt: number
  updatedAt: number
}

/**
 * 方案/项目配置文件格式（.trans-tool.json 及导出文件）
 */
export interface PresetFileFormat {
  version?: number
  name?: string
  enabledLanguages: string[]
}

/**
 * 项目配置运行时状态（不持久化到 localStorage）
 */
export interface ProjectPresetConfig {
  name: string
  enabledLanguages: Language[]
  dirHandle: any // DirectoryHandle，避免在 model 层直接依赖适配器类型
  dirty: boolean
}

/**
 * 校验方案文件格式
 * @returns 错误信息数组，空数组表示通过
 */
export function validatePresetFile(data: unknown): string[] {
  const errors: string[] = []
  if (!data || typeof data !== 'object') {
    errors.push('Invalid file format: not a JSON object')
    return errors
  }

  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.enabledLanguages)) {
    errors.push('Missing or invalid "enabledLanguages" field: must be an array')
    return errors
  }

  for (let i = 0; i < obj.enabledLanguages.length; i++) {
    const item = obj.enabledLanguages[i]
    if (typeof item !== 'string' || !item.trim()) {
      errors.push(`enabledLanguages[${i}] must be a non-empty string`)
    }
  }

  if (obj.name !== undefined && typeof obj.name !== 'string') {
    errors.push('"name" field must be a string')
  }

  return errors
}

/**
 * 解析方案文件内容，返回去重后的语言列表和未识别的语言
 */
export function parsePresetLanguages(languages: string[]): {
  known: Language[]
  unknown: string[]
} {
  const seen = new Set<string>()
  const known: Language[] = []
  const unknown: string[] = []

  for (const lang of languages) {
    const trimmed = lang.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)

    if (isKnownLanguageCode(trimmed)) {
      known.push(trimmed)
    } else {
      unknown.push(trimmed)
    }
  }

  return { known, unknown }
}

/**
 * 生成唯一 ID
 */
export function generatePresetId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 生成不重名的方案名称
 */
export function uniquePresetName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) return baseName
  let i = 2
  while (existingNames.includes(`${baseName} (${i})`)) i++
  return `${baseName} (${i})`
}

/**
 * 将方案序列化为导出/配置文件格式
 */
export function serializePreset(preset: { name: string; enabledLanguages: Language[] }): string {
  const data: PresetFileFormat = {
    version: PRESET_FILE_VERSION,
    name: preset.name,
    enabledLanguages: preset.enabledLanguages,
  }
  return JSON.stringify(data, null, 2)
}
```

- [ ] **Step 3: 运行类型检查确认无误**

Run: `npx tsc --noEmit`
Expected: 无与 `preset.ts` 或 `language.ts` 相关的错误

- [ ] **Step 4: Commit**

```bash
git add src/models/preset.ts src/models/language.ts
git commit -m "feat(preset): add preset data model and validation utilities"
```

---

## Task 2: 扩展 AppConfig 并创建 Preset Store

**Files:**
- Modify: `src/stores/config.ts`
- Create: `src/stores/preset.ts`

- [ ] **Step 1: 在 `config.ts` 中扩展 AppConfig**

在 `src/stores/config.ts` 的 `AppConfig` 接口中新增两个字段（在 `customLanguages` 之后）：

```typescript
  presets: LanguagePreset[]          // 语言方案列表
  activePresetId: string | null      // 当前激活的方案 ID（'__project__' 表示项目配置，null 为默认）
```

在 `DEFAULT_CONFIG` 中增加默认值：

```typescript
  presets: [],
  activePresetId: null,
```

补充 import：

```typescript
import type { LanguagePreset } from '@/models/preset'
```

- [ ] **Step 2: 创建 `src/stores/preset.ts`**

```typescript
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
    // 如果删除的是当前激活方案，重置为默认
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

  async function loadProjectConfig(): Promise<boolean> {
    const project = projectStore.project
    if (!project?.handle) return false

    try {
      const fs = getFileSystemAdapter()
      const exists = await fs.exists(project.handle, '.trans-tool.json')
      if (!exists) {
        projectConfig.value = null
        return false
      }

      const fileHandle = await project.handle.getFileHandle('.trans-tool.json')
      const content = await fs.readFile(fileHandle)
      const data = JSON.parse(content) as unknown

      const errors = validatePresetFile(data)
      if (errors.length > 0) {
        console.error('Invalid .trans-tool.json:', errors)
        toast.error(`项目配置文件格式错误: ${errors[0]}`)
        projectConfig.value = null
        return false
      }

      const fileData = data as PresetFileFormat
      const { known, unknown } = parsePresetLanguages(fileData.enabledLanguages)

      projectConfig.value = {
        name: fileData.name || project.name,
        enabledLanguages: known,
        dirHandle: project.handle,
        dirty: false,
      }

      // 自动切换到项目配置
      configStore.config.activePresetId = PROJECT_PRESET_ID

      // 返回未知语言信息供调用方处理
      if (unknown.length > 0) {
        return true // 调用方需检查 getUnknownLanguagesFromLastLoad()
      }

      return true
    } catch (err: any) {
      console.error('Failed to load .trans-tool.json:', err)
      projectConfig.value = null
      return false
    }
  }

  /** 上次加载时发现的未知语言（临时存储） */
  const _lastUnknownLanguages = ref<string[]>([])

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
      _lastUnknownLanguages.value = unknown

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

  async function importPreset(file: File): Promise<{
    preset: LanguagePreset
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
    const baseName = fileData.name || file.name.replace(/\.json$/i, '')
    const { known, unknown } = parsePresetLanguages(fileData.enabledLanguages)

    const preset = createPreset(baseName, known)
    return { preset, unknownLanguages: unknown }
  }

  // ===== 监听项目变化 =====

  watch(
    () => projectStore.project,
    async (newProject, oldProject) => {
      if (newProject && newProject !== oldProject) {
        await loadProjectConfigWithUnknownCheck()
      } else if (!newProject) {
        clearProjectConfig()
      }
    }
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
    loadProjectConfig,
    loadProjectConfigWithUnknownCheck,
    saveProjectConfig,
    createProjectConfig,
    updateProjectConfigLanguages,
    clearProjectConfig,
    // 导入导出
    exportPreset,
    importPreset,
  }
})
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
git add src/stores/config.ts src/stores/preset.ts
git commit -m "feat(preset): add preset store with CRUD, project config, import/export"
```

---

## Task 3: 国际化文案

**Files:**
- Modify: `src/locales/zh-CN.ts`
- Modify: `src/locales/en.ts`

- [ ] **Step 1: 在 `zh-CN.ts` 的 `settings.language` 对象内追加方案管理文案**

在 `settings.language` 对象末尾（`englishNamePlaceholder` 之后）追加：

```typescript
      // 方案管理
      presetManagement: '语言方案',
      currentPreset: '当前方案',
      defaultPreset: '默认方案',
      projectPreset: '项目配置',
      newPreset: '新建方案',
      renamePreset: '重命名',
      deletePreset: '删除方案',
      importPreset: '导入',
      exportPreset: '导出',
      presetName: '方案名称',
      presetNamePlaceholder: '请输入方案名称',
      saveToProject: '保存到项目配置',
      createProjectConfig: '创建项目配置',
      unsavedChanges: '项目配置有未保存的修改，是否保存？',
      presetDeleted: '方案已删除',
      presetRenamed: '方案已重命名',
      presetCreated: '方案已创建',
      presetSwitched: '已切换方案',
      presetExported: '方案已导出',
      presetImported: '方案已导入',
      projectConfigLoaded: '已加载项目配置',
      projectConfigSaved: '项目配置已保存',
      projectConfigCreated: '项目配置已创建',
      projectConfigSaveFailed: '保存项目配置失败',
      presetLimitReached: '方案数量已达上限 ({max})',
      unknownLanguagesTitle: '发现未识别的语言',
      unknownLanguagesMessage: '以下语言代码未在支持列表中，请添加自定义语言配置：',
      confirmDeletePreset: '确定要删除方案「{name}」吗？',
```

- [ ] **Step 2: 在 `en.ts` 的 `settings.language` 对象内追加对应英文文案**

```typescript
      // Preset management
      presetManagement: 'Language Presets',
      currentPreset: 'Current Preset',
      defaultPreset: 'Default',
      projectPreset: 'Project Config',
      newPreset: 'New Preset',
      renamePreset: 'Rename',
      deletePreset: 'Delete Preset',
      importPreset: 'Import',
      exportPreset: 'Export',
      presetName: 'Preset Name',
      presetNamePlaceholder: 'Enter preset name',
      saveToProject: 'Save to Project Config',
      createProjectConfig: 'Create Project Config',
      unsavedChanges: 'Project config has unsaved changes. Save now?',
      presetDeleted: 'Preset deleted',
      presetRenamed: 'Preset renamed',
      presetCreated: 'Preset created',
      presetSwitched: 'Preset switched',
      presetExported: 'Preset exported',
      presetImported: 'Preset imported',
      projectConfigLoaded: 'Project config loaded',
      projectConfigSaved: 'Project config saved',
      projectConfigCreated: 'Project config created',
      projectConfigSaveFailed: 'Failed to save project config',
      presetLimitReached: 'Maximum presets reached ({max})',
      unknownLanguagesTitle: 'Unknown Languages Found',
      unknownLanguagesMessage: 'The following language codes are not recognized. Please add custom language configurations:',
      confirmDeletePreset: 'Are you sure you want to delete preset "{name}"?',
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/zh-CN.ts src/locales/en.ts
git commit -m "feat(preset): add i18n messages for preset management"
```

---

## Task 4: 替换业务组件中的 `enabledLanguages` 引用

**Files:**
- Modify: `src/components/workbench/ResourceTable.vue:350-353`
- Modify: `src/components/workbench/OperationsBar.vue:97-100`
- Modify: `src/components/workbench/TranslateConfigDialog.vue:255-258`

- [ ] **Step 1: 修改 `ResourceTable.vue`**

在 script 区域的 import 部分新增：

```typescript
import { usePresetStore } from '@/stores/preset'
```

在 store 初始化处新增：

```typescript
const presetStore = usePresetStore()
```

将第 351-353 行的：

```typescript
const targetLangs = computed<Language[]>(() =>
  configStore.config.enabledLanguages.filter(l => l !== LANGUAGE.DEF)
)
```

替换为：

```typescript
const targetLangs = computed<Language[]>(() => presetStore.effectiveTargetLanguages)
```

- [ ] **Step 2: 修改 `OperationsBar.vue`**

同样新增 import 和 store 初始化，将第 98-100 行的：

```typescript
const allTargetLanguages = computed(() =>
  configStore.config.enabledLanguages.filter(l => l !== LANGUAGE.DEF)
)
```

替换为：

```typescript
const allTargetLanguages = computed(() => presetStore.effectiveTargetLanguages)
```

- [ ] **Step 3: 修改 `TranslateConfigDialog.vue`**

同样新增 import 和 store 初始化，将第 255-258 行的：

```typescript
  return (
    props.config.allTargetLanguages ||
    configStore.config.enabledLanguages.filter(l => l !== LANGUAGE.DEF)
  )
```

替换为：

```typescript
  return (
    props.config.allTargetLanguages ||
    presetStore.effectiveTargetLanguages
  )
```

- [ ] **Step 4: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/ResourceTable.vue src/components/workbench/OperationsBar.vue src/components/workbench/TranslateConfigDialog.vue
git commit -m "refactor: use presetStore.effectiveTargetLanguages in workbench components"
```

---

## Task 5: PresetSelector 主界面下拉框组件

**Files:**
- Create: `src/components/common/PresetSelector.vue`
- Modify: `src/components/layout/AppHeader.vue`

- [ ] **Step 1: 创建 `PresetSelector.vue`**

```vue
<template>
  <el-select
    :model-value="currentValue"
    @change="onSwitch"
    size="small"
    style="width: 180px"
    :placeholder="$t('settings.language.currentPreset')"
  >
    <!-- 项目配置选项 -->
    <el-option
      v-if="presetStore.hasProjectConfig"
      :value="PROJECT_PRESET_ID"
      :label="`📁 ${projectConfigName}`"
    >
      <span style="display: flex; align-items: center; gap: 6px">
        <span>📁</span>
        <span>{{ projectConfigName }}</span>
        <el-tag v-if="presetStore.isProjectConfigDirty" size="small" type="warning" style="margin-left: auto">
          {{ $t('common.edit') }}
        </el-tag>
      </span>
    </el-option>

    <!-- 分隔线 -->
    <el-divider v-if="presetStore.hasProjectConfig && presetStore.presets.length > 0" style="margin: 4px 0" />

    <!-- 用户方案列表 -->
    <el-option
      v-for="preset in presetStore.presets"
      :key="preset.id"
      :value="preset.id"
      :label="preset.name"
    />

    <!-- 分隔线 -->
    <el-divider v-if="presetStore.presets.length > 0" style="margin: 4px 0" />

    <!-- 默认方案 -->
    <el-option :value="''" :label="$t('settings.language.defaultPreset')">
      {{ $t('settings.language.defaultPreset') }}
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePresetStore } from '@/stores/preset'
import { PROJECT_PRESET_ID } from '@/models/preset'
import toast from '@/utils/toast'

const { t } = useI18n()
const presetStore = usePresetStore()

const currentValue = computed(() => {
  if (presetStore.isProjectPresetActive) return PROJECT_PRESET_ID
  return presetStore.activePresetId ?? ''
})

const projectConfigName = computed(
  () => presetStore.projectConfig?.name || t('settings.language.projectPreset')
)

async function onSwitch(value: string) {
  // 切换前检查项目配置未保存修改
  if (presetStore.isProjectConfigDirty && presetStore.isProjectPresetActive) {
    const confirmed = window.confirm(t('settings.language.unsavedChanges'))
    if (confirmed) {
      try {
        await presetStore.saveProjectConfig()
      } catch (err: any) {
        toast.error(t('settings.language.projectConfigSaveFailed'))
        return
      }
    }
  }

  const id = value === '' ? null : value
  presetStore.switchPreset(id)
  toast.success(t('settings.language.presetSwitched'))
}
</script>
```

- [ ] **Step 2: 在 `AppHeader.vue` 中集成 PresetSelector**

在 `<script setup>` 的 import 部分新增：

```typescript
import PresetSelector from '@/components/common/PresetSelector.vue'
```

在模板的 `.btn-row` div 内，`LanguageSwitcher` 之前添加：

```html
      <PresetSelector />
```

- [ ] **Step 3: 运行 dev 验证界面显示**

Run: `npx vite dev`
Expected: Header 中出现方案切换下拉框，显示"默认方案"选项

- [ ] **Step 4: Commit**

```bash
git add src/components/common/PresetSelector.vue src/components/layout/AppHeader.vue
git commit -m "feat(preset): add PresetSelector component to app header"
```

---

## Task 6: PresetManager 设置对话框组件

**Files:**
- Create: `src/components/settings/PresetManager.vue`

- [ ] **Step 1: 创建 `PresetManager.vue`**

```vue
<template>
  <div style="margin-bottom: 20px">
    <div style="font-weight: 600; margin-bottom: 8px">
      {{ $t('settings.language.presetManagement') }}
    </div>

    <!-- 方案选择与操作按钮 -->
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap">
      <el-select
        :model-value="currentSelectValue"
        @change="onPresetChange"
        style="width: 220px"
        :placeholder="$t('settings.language.currentPreset')"
      >
        <el-option
          v-if="presetStore.hasProjectConfig"
          :value="PROJECT_PRESET_ID"
          :label="`📁 ${projectConfigName}`"
        >
          <span style="display: flex; align-items: center; gap: 6px">
            <span>📁</span>
            <span style="font-weight: 500">{{ projectConfigName }}</span>
          </span>
        </el-option>
        <el-option
          v-for="preset in presetStore.presets"
          :key="preset.id"
          :value="preset.id"
          :label="preset.name"
        />
        <el-option :value="''" :label="$t('settings.language.defaultPreset')" />
      </el-select>

      <el-button size="small" @click="onCreatePreset">
        {{ $t('settings.language.newPreset') }}
      </el-button>
      <el-button
        size="small"
        @click="onRenamePreset"
        :disabled="!canEditCurrentPreset"
      >
        {{ $t('settings.language.renamePreset') }}
      </el-button>
      <el-button
        size="small"
        type="danger"
        plain
        @click="onDeletePreset"
        :disabled="!canEditCurrentPreset"
      >
        {{ $t('settings.language.deletePreset') }}
      </el-button>
      <el-button size="small" @click="onExportPreset" :disabled="!hasActivePresetOrProject">
        {{ $t('settings.language.exportPreset') }}
      </el-button>
      <el-button size="small" @click="triggerImport">
        {{ $t('settings.language.importPreset') }}
      </el-button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="onImportFile"
      />
    </div>

    <!-- 项目配置保存按钮 -->
    <div v-if="isProjectMode" style="margin-bottom: 12px">
      <el-button
        type="warning"
        size="small"
        @click="$emit('save-project-config')"
      >
        {{ $t('settings.language.saveToProject') }}
        <el-tag v-if="presetStore.isProjectConfigDirty" size="small" type="danger" style="margin-left: 6px">*</el-tag>
      </el-button>
    </div>

    <!-- 创建项目配置按钮（无项目配置时显示） -->
    <div v-if="hasProject && !presetStore.hasProjectConfig" style="margin-bottom: 12px">
      <el-button size="small" type="info" plain @click="$emit('create-project-config')">
        {{ $t('settings.language.createProjectConfig') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { usePresetStore } from '@/stores/preset'
import { useProjectStore } from '@/stores/project'
import { PROJECT_PRESET_ID } from '@/models/preset'
import toast from '@/utils/toast'

const { t } = useI18n()
const presetStore = usePresetStore()
const projectStore = useProjectStore()

const emit = defineEmits<{
  (e: 'preset-changed'): void
  (e: 'save-project-config'): void
  (e: 'create-project-config'): void
  (e: 'unknown-languages', languages: string[]): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

const hasProject = computed(() => projectStore.hasProject)

const isProjectMode = computed(() => presetStore.isProjectPresetActive)

const currentSelectValue = computed(() => {
  if (presetStore.isProjectPresetActive) return PROJECT_PRESET_ID
  return presetStore.activePresetId ?? ''
})

const projectConfigName = computed(
  () => presetStore.projectConfig?.name || t('settings.language.projectPreset')
)

/** 是否可以编辑当前选中的方案（仅用户创建的方案可编辑） */
const canEditCurrentPreset = computed(() => {
  const id = presetStore.activePresetId
  return id !== null && id !== PROJECT_PRESET_ID && presetStore.presets.some(p => p.id === id)
})

const hasActivePresetOrProject = computed(() => {
  return presetStore.activePresetId !== null || presetStore.isProjectPresetActive
})

function onPresetChange(value: string) {
  const id = value === '' ? null : value
  presetStore.switchPreset(id)
  emit('preset-changed')
}

async function onCreatePreset() {
  try {
    const { value: name } = await ElMessageBox.prompt(
      t('settings.language.presetNamePlaceholder'),
      t('settings.language.newPreset'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel') }
    )
    if (!name?.trim()) return
    presetStore.createPreset(name.trim())
    toast.success(t('settings.language.presetCreated'))
  } catch {
    // 用户取消
  }
}

async function onRenamePreset() {
  if (!presetStore.activePreset) return
  try {
    const { value: name } = await ElMessageBox.prompt(
      t('settings.language.presetNamePlaceholder'),
      t('settings.language.renamePreset'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        inputValue: presetStore.activePreset.name,
      }
    )
    if (!name?.trim()) return
    presetStore.renamePreset(presetStore.activePreset.id, name.trim())
    toast.success(t('settings.language.presetRenamed'))
  } catch {
    // 用户取消
  }
}

async function onDeletePreset() {
  if (!presetStore.activePreset) return
  try {
    await ElMessageBox.confirm(
      t('settings.language.confirmDeletePreset', { name: presetStore.activePreset.name }),
      t('settings.language.deletePreset'),
      { confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    presetStore.deletePreset(presetStore.activePreset.id)
    toast.success(t('settings.language.presetDeleted'))
    emit('preset-changed')
  } catch {
    // 用户取消
  }
}

function onExportPreset() {
  const id = presetStore.isProjectPresetActive
    ? PROJECT_PRESET_ID
    : presetStore.activePresetId
  if (!id) return
  try {
    presetStore.exportPreset(id)
    toast.success(t('settings.language.presetExported'))
  } catch (err: any) {
    toast.error(err.message)
  }
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const { unknownLanguages } = await presetStore.importPreset(file)
    toast.success(t('settings.language.presetImported'))
    if (unknownLanguages.length > 0) {
      emit('unknown-languages', unknownLanguages)
    }
    emit('preset-changed')
  } catch (err: any) {
    toast.error(err.message)
  } finally {
    input.value = '' // 允许重复导入同一文件
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/PresetManager.vue
git commit -m "feat(preset): add PresetManager component for settings dialog"
```

---

## Task 7: 集成 PresetManager 到 SettingsDialog

**Files:**
- Modify: `src/components/settings/SettingsDialog.vue`

- [ ] **Step 1: 新增 import 和 store 引用**

在 `SettingsDialog.vue` 的 `<script setup>` 中新增：

```typescript
import PresetManager from './PresetManager.vue'
import { usePresetStore } from '@/stores/preset'
import { PROJECT_PRESET_ID } from '@/models/preset'
```

```typescript
const presetStore = usePresetStore()
```

- [ ] **Step 2: 在 Language 标签页顶部集成 PresetManager**

在 `<el-tab-pane name="language">` 内部，`<!-- 默认源语言设置 -->` 注释之前，添加：

```html
          <!-- 方案管理 -->
          <PresetManager
            @preset-changed="onPresetChanged"
            @save-project-config="onSaveProjectConfig"
            @create-project-config="onCreateProjectConfig"
            @unknown-languages="onUnknownLanguages"
          />

          <el-divider />
```

- [ ] **Step 3: 添加事件处理方法**

在 `<script setup>` 中添加：

```typescript
function onPresetChanged() {
  // 方案切换后，同步语言列表到编辑区域
  const langs = presetStore.effectiveEnabledLanguages.filter(l => l !== LANGUAGE.DEF)
  enabledLangCodes.value = langs
}

async function onSaveProjectConfig() {
  try {
    // 先把当前编辑的语言列表同步到项目配置
    const langs: Language[] = [LANGUAGE.DEF, ...enabledLangCodes.value]
    presetStore.updateProjectConfigLanguages(langs)
    await presetStore.saveProjectConfig()
    toast.success(t('settings.language.projectConfigSaved'))
  } catch (err: any) {
    toast.fromError(err, t('settings.language.projectConfigSaveFailed'))
  }
}

async function onCreateProjectConfig() {
  try {
    await presetStore.createProjectConfig()
    toast.success(t('settings.language.projectConfigCreated'))
    onPresetChanged()
  } catch (err: any) {
    toast.fromError(err, t('settings.language.projectConfigSaveFailed'))
  }
}

function onUnknownLanguages(languages: string[]) {
  ElMessageBox.alert(
    `${t('settings.language.unknownLanguagesMessage')}\n\n${languages.join(', ')}`,
    t('settings.language.unknownLanguagesTitle'),
    { confirmButtonText: t('common.confirm') }
  )
}
```

新增 import（如尚未有）：

```typescript
import { ElMessageBox } from 'element-plus'
```

- [ ] **Step 4: 修改 `onSave` 方法，支持方案模式**

将现有的 `onSave` 函数修改为：

```typescript
async function onSave() {
  try {
    const langs: Language[] = [LANGUAGE.DEF, ...enabledLangCodes.value]

    // 如果当前是项目配置模式，更新项目配置的语言列表
    if (presetStore.isProjectPresetActive) {
      presetStore.updateProjectConfigLanguages(langs)
    }
    // 如果当前选中了用户方案，更新该方案
    else if (presetStore.activePreset) {
      presetStore.updatePresetLanguages(presetStore.activePreset.id, langs)
    }

    // 始终同步到 config（默认方案兜底）
    configStore.update('enabledLanguages', langs)
    configStore.update('defaultSourceLanguage', selectedSourceLanguage.value)
    await configStore.save()
    toast.success(t('settings.toast.saved'))
    closeDialog()
  } catch (error: any) {
    toast.fromError(error, t('settings.toast.saveFailed'))
  }
}
```

- [ ] **Step 5: 修改打开对话框时的语言列表加载逻辑**

将现有的第一个 watch（第 626-637 行）修改为，使用 `effectiveEnabledLanguages`：

```typescript
watch(
  () => props.visible,
  visible => {
    if (visible) {
      activeTab.value = 'general'
      const current = presetStore.effectiveEnabledLanguages
      enabledLangCodes.value = current.filter(l => l !== LANGUAGE.DEF)
      selectedSourceLanguage.value = form.value.defaultSourceLanguage || LANGUAGE.DEF
    }
  }
)
```

同时更新第二个 watch（第 899-909 行），将重复的加载逻辑移除，只保留自定义语言加载：

```typescript
watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadCustomLanguages()
    }
  }
)
```

注意：两个 watch 合并为一个即可。

- [ ] **Step 6: 运行 dev 验证**

Run: `npx vite dev`
Expected:
- 打开设置 → Language 标签页，顶部显示方案管理区域
- 可以新建/切换/删除方案
- 语言列表随方案切换而更新

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/SettingsDialog.vue
git commit -m "feat(preset): integrate PresetManager into settings dialog"
```

---

## Task 8: 端到端验证与修复

- [ ] **Step 1: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: 运行现有测试**

Run: `npx vitest run`
Expected: 所有现有测试通过

- [ ] **Step 3: 手动验证核心流程**

Run: `npx vite dev`

验证清单：
1. 打开应用 → Header 显示方案选择器，默认为"默认方案"
2. 设置 → Language → 新建方案 → 输入名称 → 创建成功
3. 在方案下拉框中切换方案 → 语言列表随之更新
4. 导出方案 → 下载 JSON 文件，内容包含 version、name、enabledLanguages
5. 导入刚导出的文件 → 作为新方案添加成功
6. 打开一个包含 `.trans-tool.json` 的项目目录 → 自动切换到"📁 项目配置"
7. 修改项目配置语言列表 → 点击"保存到项目配置" → 写回文件成功
8. 手动切换到其他方案 → 语言列表更新，项目配置不受影响
9. 翻译功能正常使用（语言列表来自当前方案）

- [ ] **Step 4: 修复发现的问题**

根据验证结果修复问题。

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat(preset): language preset management and project config support"
```
