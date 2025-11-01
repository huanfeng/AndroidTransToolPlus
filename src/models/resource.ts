import type { Language } from './language'

/**
 * 资源类型
 */
export type ResourceType = 'string' | 'string-array'

/**
 * 资源项接口
 */
export interface ResItem {
  type: ResourceType
  name: string // 资源ID
  translatable: boolean
  valueMap: Map<Language, string | string[]>
  getValue(lang: Language): string | string[] | undefined
  setValue(lang: Language, value: string | string[]): void
  hasValue(lang: Language): boolean
  clone(): ResItem
}

/**
 * 字符串资源项
 */
export class StringItem implements ResItem {
  type: ResourceType = 'string'
  name: string
  translatable: boolean
  valueMap: Map<Language, string>

  constructor(name: string, translatable: boolean = true) {
    this.name = name
    this.translatable = translatable
    this.valueMap = new Map()
  }

  getValue(lang: Language): string | undefined {
    return this.valueMap.get(lang)
  }

  setValue(lang: Language, value: string): void {
    this.valueMap.set(lang, value)
  }

  hasValue(lang: Language): boolean {
    const value = this.valueMap.get(lang)
    return value !== undefined && value !== ''
  }

  clone(): StringItem {
    const item = new StringItem(this.name, this.translatable)
    item.valueMap = new Map(this.valueMap)
    return item
  }
}

/**
 * 字符串数组资源项
 */
export class ArrayItem implements ResItem {
  type: ResourceType = 'string-array'
  name: string
  translatable: boolean
  valueMap: Map<Language, string[]>

  constructor(name: string, translatable: boolean = true) {
    this.name = name
    this.translatable = translatable
    this.valueMap = new Map()
  }

  getValue(lang: Language): string[] | undefined {
    return this.valueMap.get(lang)
  }

  setValue(lang: Language, value: string[]): void {
    this.valueMap.set(lang, value)
  }

  hasValue(lang: Language): boolean {
    const value = this.valueMap.get(lang)
    return value !== undefined && value.length > 0
  }

  clone(): ArrayItem {
    const item = new ArrayItem(this.name, this.translatable)
    item.valueMap = new Map(
      Array.from(this.valueMap.entries()).map(([k, v]) => [k, [...v]])
    )
    return item
  }
}

/**
 * 创建资源项
 */
export function createResItem(
  type: ResourceType,
  name: string,
  translatable: boolean = true
): ResItem {
  if (type === 'string') {
    return new StringItem(name, translatable)
  } else {
    return new ArrayItem(name, translatable)
  }
}
