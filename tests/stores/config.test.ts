/**
 * @vitest-environment happy-dom
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { initAdapters } from '@/adapters'
import { useConfigStore } from '@/stores/config'
import { LanguageManager } from '@/models/language'

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
      androidCode: 'th',
      nameCn: '泰语',
      nameEn: 'Thai',
    })

    expect(store.config.enabledLanguages).toContain('th')

    const thai = store.getAllAvailableLanguages().find(lang => lang.code === 'th')
    expect(thai).toMatchObject({
      code: 'th',
      androidCode: 'th',
      nameCn: '泰语',
      nameEn: 'Thai',
      valuesDirName: 'values-th',
      isDefault: false,
    })
  })

  it('删除自定义语言时应同步清理已启用和目标语言中的残留项', async () => {
    const store = useConfigStore()
    await store.load()

    store.addCustomLanguage({
      androidCode: 'vi',
      nameCn: '越南语',
      nameEn: 'Vietnamese',
    })
    store.update('targetLanguages', ['vi'])

    expect(store.config.enabledLanguages).toContain('vi')
    expect(store.config.targetLanguages).toContain('vi')

    expect(store.removeCustomLanguage('vi')).toBe(true)
    expect(store.config.enabledLanguages).not.toContain('vi')
    expect(store.config.targetLanguages).not.toContain('vi')
    expect(store.getAllAvailableLanguages().find(lang => lang.code === 'vi')).toBeUndefined()
  })
})
