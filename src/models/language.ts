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
