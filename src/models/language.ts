/**
 * 语言枚举
 */
export enum Language {
  DEF = 'def',
  CN = 'cn',
  CN_HK = 'cnHk',
  CN_TW = 'cnTw',
  AR = 'ar',
  DE = 'de',
  FR = 'fr',
  HI = 'hi',
  IT = 'it',
  IW = 'iw',
  JA = 'ja',
  KO = 'ko',
  RU = 'ru',
  UK = 'uk',
}

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
 * 语言映射表
 */
export const LANGUAGE_MAP: Record<Language, LanguageInfo> = {
  [Language.DEF]: {
    code: Language.DEF,
    androidCode: '',
    nameCn: '默认(英文)',
    nameEn: 'Default(English)',
    valuesDirName: 'values',
  },
  [Language.CN]: {
    code: Language.CN,
    androidCode: 'zh-rCN',
    nameCn: '简体中文',
    nameEn: 'Simplified Chinese',
    valuesDirName: 'values-zh-rCN',
  },
  [Language.CN_HK]: {
    code: Language.CN_HK,
    androidCode: 'zh-rHK',
    nameCn: '繁體中文',
    nameEn: 'Traditional Chinese (HK)',
    valuesDirName: 'values-zh-rHK',
  },
  [Language.CN_TW]: {
    code: Language.CN_TW,
    androidCode: 'zh-rTW',
    nameCn: '繁體中文',
    nameEn: 'Traditional Chinese (TW)',
    valuesDirName: 'values-zh-rTW',
  },
  [Language.AR]: {
    code: Language.AR,
    androidCode: 'ar',
    nameCn: '阿拉伯语',
    nameEn: 'Arabic',
    valuesDirName: 'values-ar',
  },
  [Language.DE]: {
    code: Language.DE,
    androidCode: 'de',
    nameCn: '德语',
    nameEn: 'German',
    valuesDirName: 'values-de',
  },
  [Language.FR]: {
    code: Language.FR,
    androidCode: 'fr',
    nameCn: '法语',
    nameEn: 'French',
    valuesDirName: 'values-fr',
  },
  [Language.HI]: {
    code: Language.HI,
    androidCode: 'hi',
    nameCn: '印地语',
    nameEn: 'Hindi',
    valuesDirName: 'values-hi',
  },
  [Language.IT]: {
    code: Language.IT,
    androidCode: 'it',
    nameCn: '意大利语',
    nameEn: 'Italian',
    valuesDirName: 'values-it',
  },
  [Language.IW]: {
    code: Language.IW,
    androidCode: 'iw',
    nameCn: '希伯来语',
    nameEn: 'Hebrew',
    valuesDirName: 'values-iw',
  },
  [Language.JA]: {
    code: Language.JA,
    androidCode: 'ja',
    nameCn: '日语',
    nameEn: 'Japanese',
    valuesDirName: 'values-ja',
  },
  [Language.KO]: {
    code: Language.KO,
    androidCode: 'ko',
    nameCn: '韩语',
    nameEn: 'Korean',
    valuesDirName: 'values-ko',
  },
  [Language.RU]: {
    code: Language.RU,
    androidCode: 'ru',
    nameCn: '俄语',
    nameEn: 'Russian',
    valuesDirName: 'values-ru',
  },
  [Language.UK]: {
    code: Language.UK,
    androidCode: 'uk',
    nameCn: '乌克兰语',
    nameEn: 'Ukrainian',
    valuesDirName: 'values-uk',
  },
}

/**
 * 获取所有语言列表
 */
export function getAllLanguages(): Language[] {
  return Object.values(Language)
}

/**
 * 从 Android 代码获取语言
 */
export function getLanguageByAndroidCode(code: string): Language | null {
  if (code === '' || code === 'values') {
    return Language.DEF
  }

  // 移除 values- 前缀
  const langCode = code.startsWith('values-') ? code.substring(7) : code

  for (const [key, info] of Object.entries(LANGUAGE_MAP)) {
    if (info.androidCode === langCode) {
      return key as Language
    }
  }
  return null
}

/**
 * 从 values 目录名获取语言
 */
export function getLanguageByValuesDirName(dirName: string): Language | null {
  if (dirName === 'values') {
    return Language.DEF
  }

  for (const [key, info] of Object.entries(LANGUAGE_MAP)) {
    if (info.valuesDirName === dirName) {
      return key as Language
    }
  }
  return null
}

/**
 * 获取语言信息
 */
export function getLanguageInfo(lang: Language): LanguageInfo {
  return LANGUAGE_MAP[lang]
}

/**
 * 获取语言显示名称
 */
export function getLanguageName(lang: Language, locale: 'cn' | 'en' = 'cn'): string {
  const info = LANGUAGE_MAP[lang]
  return locale === 'cn' ? info.nameCn : info.nameEn
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
 * 语言管理类
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

  /**
   * 设置自定义语言列表
   */
  setCustomLanguages(languages: CustomLanguage[]): void {
    this.customLanguages = [...languages]
  }

  /**
   * 获取自定义语言列表
   */
  getCustomLanguages(): CustomLanguage[] {
    return [...this.customLanguages]
  }

  /**
   * 添加自定义语言
   */
  addCustomLanguage(lang: CustomLanguage): void {
    // 检查是否已存在
    if (this.customLanguages.some(l => l.androidCode === lang.androidCode)) {
      throw new Error(`Language with Android code "${lang.androidCode}" already exists`)
    }

    // 验证 Android 代码格式
    if (!this.isValidAndroidCode(lang.androidCode)) {
      throw new Error(`Invalid Android language code: ${lang.androidCode}`)
    }

    // 检查与默认语言冲突
    const existsInDefault = Object.values(LANGUAGE_MAP).some(
      info => info.androidCode === lang.androidCode
    )
    if (existsInDefault) {
      throw new Error(
        `Language with Android code "${lang.androidCode}" already exists in default languages`
      )
    }

    // 自动生成 values 目录名（如果未提供）
    if (!lang.valuesDirName) {
      lang.valuesDirName = this.generateValuesDirName(lang.androidCode)
    }

    this.customLanguages.push({ ...lang })
  }

  /**
   * 删除自定义语言
   */
  removeCustomLanguage(androidCode: string): boolean {
    const index = this.customLanguages.findIndex(l => l.androidCode === androidCode)
    if (index >= 0) {
      this.customLanguages.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 验证 Android 语言代码
   */
  private isValidAndroidCode(code: string): boolean {
    // 基本格式验证：必须是字母开头，可以包含 -r 后缀
    return /^[a-z]{2,3}(-[rA-Z]{2})?$/.test(code)
  }

  /**
   * 生成 values 目录名
   */
  generateValuesDirName(androidCode: string): string {
    return `values${androidCode ? '-' + androidCode : ''}`
  }

  /**
   * 获取所有语言（默认 + 自定义）
   */
  getAllLanguages(): FullLanguageInfo[] {
    const result: FullLanguageInfo[] = []

    // 添加默认语言
    for (const [key, info] of Object.entries(LANGUAGE_MAP)) {
      result.push({
        code: key,
        androidCode: info.androidCode,
        nameCn: info.nameCn,
        nameEn: info.nameEn,
        valuesDirName: info.valuesDirName,
        isDefault: true,
      })
    }

    // 添加自定义语言
    for (const custom of this.customLanguages) {
      result.push({
        code: custom.androidCode, // 使用 Android 代码作为唯一标识
        androidCode: custom.androidCode,
        nameCn: custom.nameCn,
        nameEn: custom.nameEn,
        valuesDirName: custom.valuesDirName || this.generateValuesDirName(custom.androidCode),
        isDefault: false,
      })
    }

    // 按代码排序
    result.sort((a, b) => a.code.localeCompare(b.code))

    return result
  }

  /**
   * 获取所有语言代码列表
   */
  getAllLanguageCodes(): string[] {
    return this.getAllLanguages().map(l => l.code)
  }

  /**
   * 根据代码获取语言信息
   */
  getLanguageInfoByCode(code: string): FullLanguageInfo | null {
    const allLangs = this.getAllLanguages()
    return allLangs.find(l => l.code === code) || null
  }

  /**
   * 根据 Android 代码获取语言信息
   */
  getLanguageInfoByAndroidCode(androidCode: string): FullLanguageInfo | null {
    const allLangs = this.getAllLanguages()
    return allLangs.find(l => l.androidCode === androidCode) || null
  }

  /**
   * 根据 values 目录名获取语言信息
   */
  getLanguageInfoByValuesDir(dirName: string): FullLanguageInfo | null {
    const allLangs = this.getAllLanguages()
    return allLangs.find(l => l.valuesDirName === dirName) || null
  }

  /**
   * 从代码转换为 Language 枚举（仅适用于默认语言）
   */
  toLanguageEnum(code: string): Language | null {
    const langMap: Record<string, Language> = {
      def: Language.DEF,
      cn: Language.CN,
      cnHk: Language.CN_HK,
      cnTw: Language.CN_TW,
      ar: Language.AR,
      de: Language.DE,
      fr: Language.FR,
      hi: Language.HI,
      it: Language.IT,
      iw: Language.IW,
      ja: Language.JA,
      ko: Language.KO,
      ru: Language.RU,
      uk: Language.UK,
    }
    return langMap[code] || null
  }
}
