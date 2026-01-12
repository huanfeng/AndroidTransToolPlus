import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import en from './en'

export type LocaleType = 'zh-CN' | 'en'

export const LOCALE_OPTIONS: { value: LocaleType; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en: en,
  },
})

/**
 * 切换语言
 */
export function setLocale(locale: LocaleType) {
  ;(i18n.global.locale as any).value = locale
}

/**
 * 获取当前语言
 */
export function getLocale(): LocaleType {
  return (i18n.global.locale as any).value
}
