/**
 * @vitest-environment happy-dom
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { initAdapters } from '@/adapters'
import { useConfigStore } from '@/stores/config'
import {
  getBuiltinLanguages,
  getDefaultEnabledBuiltinLanguages,
  getLanguageByAndroidCode,
  LanguageManager,
} from '@/models/language'

describe('config store - 自定义语言', () => {
  beforeAll(async () => {
    await initAdapters()
  })

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    LanguageManager.getInstance().setCustomLanguages([])
  })

  it('新增自定义语言后应自动加入已启用语言并出现在可用语言列表中', async () => {
    const store = useConfigStore()
    await store.load()

    store.addCustomLanguage({
      androidCode: 'sw',
      nameCn: '斯瓦希里语',
      nameEn: 'Swahili',
    })

    expect(store.config.enabledLanguages).toContain('sw')

    const swahili = store.getAllAvailableLanguages().find(lang => lang.code === 'sw')
    expect(swahili).toMatchObject({
      code: 'sw',
      androidCode: 'sw',
      nameCn: '斯瓦希里语',
      nameEn: 'Swahili',
      valuesDirName: 'values-sw',
      isDefault: false,
    })
  })

  it('删除自定义语言时应同步清理已启用和目标语言中的残留项', async () => {
    const store = useConfigStore()
    await store.load()

    store.addCustomLanguage({
      androidCode: 'am',
      nameCn: '阿姆哈拉语',
      nameEn: 'Amharic',
    })
    store.update('targetLanguages', ['am'])

    expect(store.config.enabledLanguages).toContain('am')
    expect(store.config.targetLanguages).toContain('am')

    expect(store.removeCustomLanguage('am')).toBe(true)
    expect(store.config.enabledLanguages).not.toContain('am')
    expect(store.config.targetLanguages).not.toContain('am')
    expect(store.getAllAvailableLanguages().find(lang => lang.code === 'am')).toBeUndefined()
  })

  it('应提供更多内置安卓语言，但默认启用列表保持不变', async () => {
    const store = useConfigStore()
    await store.load()

    const builtinLanguages = getBuiltinLanguages()
    const defaultEnabled = getDefaultEnabledBuiltinLanguages()

    expect(builtinLanguages).toContain('th')
    expect(builtinLanguages).toContain('vi')
    expect(builtinLanguages).toContain('id')
    expect(builtinLanguages).toContain('nl')
    expect(getLanguageByAndroidCode('th')).toBe('th')
    expect(getLanguageByAndroidCode('vi')).toBe('vi')

    expect(defaultEnabled).not.toContain('th')
    expect(defaultEnabled).not.toContain('vi')
    expect(store.config.enabledLanguages).toEqual(defaultEnabled)
  })
})
