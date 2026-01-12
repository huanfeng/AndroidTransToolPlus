/**
 * 语言模型：使用 string 表示语言代码，内置语言通过常量维护，可扩展自定义语言
 */

export type Language = string

/**
 * 内置语言常量（替代枚举）
 */
export const LANGUAGE = {
  DEF: 'def',
  CN: 'cn',
  CN_HK: 'cnHk',
  CN_TW: 'cnTw',
  AR: 'ar',
  DE: 'de',
  ES: 'es',
  FR: 'fr',
  HI: 'hi',
  IT: 'it',
  IW: 'iw',
  JA: 'ja',
  KO: 'ko',
  PT: 'pt',
  RU: 'ru',
  UK: 'uk',
} as const

export const DEFAULT_LANGUAGE = LANGUAGE.DEF

/**
 * 语言信息
 */
export interface LanguageInfo {
  code: Language
  androidCode: string // Android 语言代码
  nameCn: string // 中文名称
  nameEn: string // 英文名称
  valuesDirName: string // values 目录名
}

/**
 * 内置语言信息表
 */
export const BUILTIN_LANGUAGES: Record<string, LanguageInfo> = {
  [LANGUAGE.DEF]: {
    code: LANGUAGE.DEF,
    androidCode: '',
    nameCn: '默认(英文)',
    nameEn: 'Default(English)',
    valuesDirName: 'values',
  },
  [LANGUAGE.CN]: {
    code: LANGUAGE.CN,
    androidCode: 'zh-rCN',
    nameCn: '简体中文',
    nameEn: 'Simplified Chinese',
    valuesDirName: 'values-zh-rCN',
  },
  [LANGUAGE.CN_HK]: {
    code: LANGUAGE.CN_HK,
    androidCode: 'zh-rHK',
    nameCn: '繁體中文',
    nameEn: 'Traditional Chinese (HK)',
    valuesDirName: 'values-zh-rHK',
  },
  [LANGUAGE.CN_TW]: {
    code: LANGUAGE.CN_TW,
    androidCode: 'zh-rTW',
    nameCn: '繁體中文',
    nameEn: 'Traditional Chinese (TW)',
    valuesDirName: 'values-zh-rTW',
  },
  [LANGUAGE.AR]: {
    code: LANGUAGE.AR,
    androidCode: 'ar',
    nameCn: '阿拉伯语',
    nameEn: 'Arabic',
    valuesDirName: 'values-ar',
  },
  [LANGUAGE.DE]: {
    code: LANGUAGE.DE,
    androidCode: 'de',
    nameCn: '德语',
    nameEn: 'German',
    valuesDirName: 'values-de',
  },
  [LANGUAGE.ES]: {
    code: LANGUAGE.ES,
    androidCode: 'es',
    nameCn: '西班牙语',
    nameEn: 'Spanish',
    valuesDirName: 'values-es',
  },
  [LANGUAGE.FR]: {
    code: LANGUAGE.FR,
    androidCode: 'fr',
    nameCn: '法语',
    nameEn: 'French',
    valuesDirName: 'values-fr',
  },
  [LANGUAGE.HI]: {
    code: LANGUAGE.HI,
    androidCode: 'hi',
    nameCn: '印地语',
    nameEn: 'Hindi',
    valuesDirName: 'values-hi',
  },
  [LANGUAGE.IT]: {
    code: LANGUAGE.IT,
    androidCode: 'it',
    nameCn: '意大利语',
    nameEn: 'Italian',
    valuesDirName: 'values-it',
  },
  [LANGUAGE.IW]: {
    code: LANGUAGE.IW,
    androidCode: 'iw',
    nameCn: '希伯来语',
    nameEn: 'Hebrew',
    valuesDirName: 'values-iw',
  },
  [LANGUAGE.JA]: {
    code: LANGUAGE.JA,
    androidCode: 'ja',
    nameCn: '日语',
    nameEn: 'Japanese',
    valuesDirName: 'values-ja',
  },
  [LANGUAGE.KO]: {
    code: LANGUAGE.KO,
    androidCode: 'ko',
    nameCn: '韩语',
    nameEn: 'Korean',
    valuesDirName: 'values-ko',
  },
  [LANGUAGE.PT]: {
    code: LANGUAGE.PT,
    androidCode: 'pt',
    nameCn: '葡萄牙语',
    nameEn: 'Portuguese',
    valuesDirName: 'values-pt',
  },
  [LANGUAGE.RU]: {
    code: LANGUAGE.RU,
    androidCode: 'ru',
    nameCn: '俄语',
    nameEn: 'Russian',
    valuesDirName: 'values-ru',
  },
  [LANGUAGE.UK]: {
    code: LANGUAGE.UK,
    androidCode: 'uk',
    nameCn: '乌克兰语',
    nameEn: 'Ukrainian',
    valuesDirName: 'values-uk',
  },
}

/**
 * 自定义语言配置
 */
export interface CustomLanguage {
  androidCode: string // Android 语言代码（如 zh-rCN, ar, de）
  nameCn: string // 中文显示名称
  nameEn: string // 英文名称（用于AI翻译）
  valuesDirName?: string // values 目录名（可选，自动生成）
}

/**
 * 完整的语言信息（合并默认和自定义）
 */
export interface FullLanguageInfo {
  code: string // 语言唯一标识
  androidCode: string // Android 语言代码
  nameCn: string // 中文名称
  nameEn: string // 英文名称
  valuesDirName: string // values 目录名
  isDefault: boolean // 是否为默认语言
}

/**
 * 获取所有内置语言代码
 */
export function getBuiltinLanguages(): Language[] {
  return Object.values(LANGUAGE)
}

/**
 * 为兼容旧调用，保留名称：仅返回内置语言
 */
export function getAllLanguages(): Language[] {
  return getBuiltinLanguages()
}

/**
 * 从 Android 代码获取语言
 */
export function getLanguageByAndroidCode(code: string): Language | null {
  if (code === '' || code === 'values') {
    return LANGUAGE.DEF
  }

  const langCode = code.startsWith('values-') ? code.substring(7) : code

  for (const info of Object.values(BUILTIN_LANGUAGES)) {
    if (info.androidCode === langCode) {
      return info.code
    }
  }

  const custom = LanguageManager.getInstance().getLanguageInfoByAndroidCode(langCode)
  return custom ? custom.code : null
}

/**
 * 从 values 目录名获取语言
 */
export function getLanguageByValuesDirName(dirName: string): Language | null {
  if (dirName === 'values') {
    return LANGUAGE.DEF
  }

  for (const info of Object.values(BUILTIN_LANGUAGES)) {
    if (info.valuesDirName === dirName) {
      return info.code
    }
  }

  const custom = LanguageManager.getInstance().getLanguageInfoByValuesDir(dirName)
  return custom ? custom.code : null
}

/**
 * 获取语言信息（内置优先，自定义其次，失败返回占位信息）
 */
export function getLanguageInfo(lang: Language): LanguageInfo {
  const builtin = BUILTIN_LANGUAGES[lang]
  if (builtin) return builtin

  const custom = LanguageManager.getInstance().getLanguageInfoByCode(lang)
  if (custom) {
    return {
      code: custom.code,
      androidCode: custom.androidCode,
      nameCn: custom.nameCn,
      nameEn: custom.nameEn,
      valuesDirName: custom.valuesDirName,
    }
  }

  // 占位，避免因未知语言导致崩溃
  return {
    code: lang,
    androidCode: lang,
    nameCn: lang,
    nameEn: lang,
    valuesDirName: LanguageManager.getInstance().generateValuesDirName(lang),
  }
}

/**
 * 获取语言显示名称
 */
export function getLanguageName(lang: Language, locale: 'cn' | 'en' = 'cn'): string {
  const info = getLanguageInfo(lang)
  return locale === 'cn' ? info.nameCn : info.nameEn
}

/**
 * 获取完整语言信息（兼容自定义语言）
 */
export function getFullLanguageInfo(code: Language): FullLanguageInfo | null {
  return LanguageManager.getInstance().getLanguageInfoByCode(code)
}

/**
 * 获取语言显示名称（兼容自定义语言）
 */
export function getLanguageLabel(code: Language, locale: 'cn' | 'en' = 'cn'): string {
  const info = getFullLanguageInfo(code)
  if (!info) return String(code)
  const name = locale === 'cn' ? info.nameCn : info.nameEn
  const suffix = info.androidCode || info.valuesDirName
  return `${name} (${suffix})`
}

/**
 * 获取源语言显示名称（用于 values 目录）
 * @param sourceLanguage 配置的源语言代码
 * @param locale 显示语言
 */
export function getSourceLanguageLabel(
  sourceLanguage: Language,
  locale: 'cn' | 'en' = 'cn'
): string {
  if (sourceLanguage === LANGUAGE.DEF) {
    // 默认保持原来的显示
    return locale === 'cn' ? '默认(英文)' : 'Default(English)'
  }
  const info = getFullLanguageInfo(sourceLanguage)
  if (!info) return String(sourceLanguage)
  const name = locale === 'cn' ? info.nameCn : info.nameEn
  return `${name} (values)`
}

/**
 * 获取源语言的英文名称（用于 AI 翻译 prompt）
 * @param sourceLanguage 配置的源语言代码
 */
export function getSourceLanguageNameEn(sourceLanguage: Language): string {
  if (sourceLanguage === LANGUAGE.DEF) {
    return 'English'
  }
  const info = getFullLanguageInfo(sourceLanguage)
  return info?.nameEn || 'English'
}

/**
 * 语言管理类：维护自定义语言并提供统一查询
 */
export class LanguageManager {
  private static instance: LanguageManager
  private customLanguages: CustomLanguage[] = []

  private constructor() {}

  static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager()
    }
    return LanguageManager.instance
  }

  setCustomLanguages(languages: CustomLanguage[]): void {
    this.customLanguages = [...languages]
  }

  getCustomLanguages(): CustomLanguage[] {
    return [...this.customLanguages]
  }

  addCustomLanguage(lang: CustomLanguage): void {
    if (this.customLanguages.some(l => l.androidCode === lang.androidCode)) {
      throw new Error(`Language with Android code "${lang.androidCode}" already exists`)
    }

    if (!this.isValidAndroidCode(lang.androidCode)) {
      throw new Error(`Invalid Android language code: ${lang.androidCode}`)
    }

    const existsInBuiltin = Object.values(BUILTIN_LANGUAGES).some(
      info => info.androidCode === lang.androidCode
    )
    if (existsInBuiltin) {
      throw new Error(
        `Language with Android code "${lang.androidCode}" already exists in builtin languages`
      )
    }

    const valuesDirName = lang.valuesDirName || this.generateValuesDirName(lang.androidCode)
    this.customLanguages.push({ ...lang, valuesDirName })
  }

  removeCustomLanguage(androidCode: string): boolean {
    const index = this.customLanguages.findIndex(l => l.androidCode === androidCode)
    if (index >= 0) {
      this.customLanguages.splice(index, 1)
      return true
    }
    return false
  }

  updateCustomLanguage(
    androidCode: string,
    updates: Partial<Omit<CustomLanguage, 'androidCode'>>
  ): boolean {
    const index = this.customLanguages.findIndex(l => l.androidCode === androidCode)
    if (index < 0) {
      return false
    }

    const existing = this.customLanguages[index]
    this.customLanguages[index] = {
      ...existing,
      nameCn: updates.nameCn ?? existing.nameCn,
      nameEn: updates.nameEn ?? existing.nameEn,
      valuesDirName: updates.valuesDirName ?? existing.valuesDirName,
    }
    return true
  }

  isValidAndroidCode(code: string): boolean {
    return /^[a-z]{2,3}(-[rA-Z]{2})?$/.test(code)
  }

  generateValuesDirName(androidCode: string): string {
    return `values${androidCode ? '-' + androidCode : ''}`
  }

  getAllLanguages(): FullLanguageInfo[] {
    const result: FullLanguageInfo[] = []

    for (const info of Object.values(BUILTIN_LANGUAGES)) {
      result.push({ ...info, isDefault: true })
    }

    for (const custom of this.customLanguages) {
      result.push({
        code: custom.androidCode,
        androidCode: custom.androidCode,
        nameCn: custom.nameCn,
        nameEn: custom.nameEn,
        valuesDirName: custom.valuesDirName || this.generateValuesDirName(custom.androidCode),
        isDefault: false,
      })
    }

    result.sort((a, b) => a.code.localeCompare(b.code))
    return result
  }

  getAllLanguageCodes(): string[] {
    return this.getAllLanguages().map(l => l.code)
  }

  getLanguageInfoByCode(code: string): FullLanguageInfo | null {
    return this.getAllLanguages().find(l => l.code === code) || null
  }

  getLanguageInfoByAndroidCode(androidCode: string): FullLanguageInfo | null {
    return this.getAllLanguages().find(l => l.androidCode === androidCode) || null
  }

  getLanguageInfoByValuesDir(dirName: string): FullLanguageInfo | null {
    return this.getAllLanguages().find(l => l.valuesDirName === dirName) || null
  }

  /**
   * 兼容旧调用：将字符串代码映射到已知语言，否则返回 null
   */
  toLanguageEnum(code: string): Language | null {
    if (BUILTIN_LANGUAGES[code]) return code
    const custom = this.customLanguages.find(
      l => l.androidCode === code || l.valuesDirName === code
    )
    return custom ? custom.androidCode : null
  }
}
