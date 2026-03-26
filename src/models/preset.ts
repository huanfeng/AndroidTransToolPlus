import type { Language } from './language'
import { normalizeToInternalCode, toAndroidCode } from './language'

/** 方案配置文件版本 */
export const PRESET_FILE_VERSION = 1

/** 项目配置的特殊方案 ID */
export const PROJECT_PRESET_ID = '__project__'

/** 默认方案的标识值（用于 UI 下拉框，区别于空字符串） */
export const DEFAULT_PRESET_ID = '__default__'

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
 * 支持内部代码（如 cn, cnTw）和 Android 代码（如 zh-rCN, zh-rTW）两种格式
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

    // 规范化为内部代码（同时支持内部代码和 Android 代码）
    const internalCode = normalizeToInternalCode(trimmed)
    if (internalCode && !known.includes(internalCode)) {
      known.push(internalCode)
    } else if (!internalCode) {
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
 * 语言代码统一使用 Android 格式（如 zh-rCN, zh-rTW）
 */
export function serializePreset(preset: { name: string; enabledLanguages: Language[] }): string {
  const data: PresetFileFormat = {
    version: PRESET_FILE_VERSION,
    name: preset.name,
    enabledLanguages: preset.enabledLanguages.map(toAndroidCode),
  }
  return JSON.stringify(data, null, 2)
}
