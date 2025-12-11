import { describe, it, expect } from 'vitest'
import { generateXml } from '@/services/xml/generator'
import { LANGUAGE } from '@/models/language'
import { StringItem } from '@/models/resource'

describe('generateXml', () => {
  it('保留 translatable="false" 的条目并写入标记', () => {
    const item = new StringItem('app_name', false)
    item.setValue(LANGUAGE.DEF, 'Example App')

    const { xml, hasEntries } = generateXml(new Map([['app_name', item]]), LANGUAGE.DEF)

    expect(hasEntries).toBe(true)
    expect(xml).toContain('translatable="false"')
    expect(xml).toContain('Example App')
  })

  it('在没有可写内容时返回空资源标记', () => {
    const item = new StringItem('empty_key', true)
    const { hasEntries, xml } = generateXml(new Map([['empty_key', item]]), LANGUAGE.DEF)

    expect(hasEntries).toBe(false)
    expect(xml).toContain('<resources>')
  })
})
