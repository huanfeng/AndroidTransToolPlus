/**
 * XML 解析服务
 * 解析 Android 字符串资源 XML 文件
 */

import { XMLParser } from 'fast-xml-parser'
import type { Language } from '@/models/language'
import { StringItem, ArrayItem, type ResItem } from '@/models/resource'

/**
 * XML 解析选项
 */
const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues: true,
}

/**
 * 解析 Android 字符串资源 XML
 */
export function parseXml(xmlContent: string, language: Language): Map<string, ResItem> {
  const parser = new XMLParser(PARSER_OPTIONS)
  const result = parser.parse(xmlContent)
  const items = new Map<string, ResItem>()

  if (!result.resources) {
    return items
  }

  const resources = result.resources

  // 解析 <string> 标签
  if (resources.string) {
    parseStringElements(resources.string, language, items)
  }

  // 解析 <string-array> 标签
  if (resources['string-array']) {
    parseArrayElements(resources['string-array'], language, items)
  }

  return items
}

/**
 * 解析 string 元素
 */
function parseStringElements(
  stringElements: any,
  language: Language,
  items: Map<string, ResItem>
): void {
  // 确保是数组
  const elements = Array.isArray(stringElements) ? stringElements : [stringElements]

  for (const element of elements) {
    if (!element || typeof element !== 'object') continue

    const name = element['@_name']
    if (!name) continue

    // 检查 translatable 属性
    const translatable = element['@_translatable'] !== 'false'

    // 获取文本内容
    let value = ''
    if (element['#text'] !== undefined) {
      value = String(element['#text'])
    } else if (typeof element === 'string') {
      value = element
    }

    // 去除前后引号
    value = trimQuotes(value)

    // 获取或创建 StringItem
    let item = items.get(name) as StringItem
    if (!item) {
      item = new StringItem(name, translatable)
      items.set(name, item)
    }

    // 设置值
    item.setValue(language, value)
  }
}

/**
 * 解析 string-array 元素
 */
function parseArrayElements(
  arrayElements: any,
  language: Language,
  items: Map<string, ResItem>
): void {
  // 确保是数组
  const elements = Array.isArray(arrayElements) ? arrayElements : [arrayElements]

  for (const element of elements) {
    if (!element || typeof element !== 'object') continue

    const name = element['@_name']
    if (!name) continue

    // 检查 translatable 属性
    const translatable = element['@_translatable'] !== 'false'

    // 获取数组项
    const values: string[] = []
    if (element.item) {
      const itemElements = Array.isArray(element.item) ? element.item : [element.item]
      for (const itemElement of itemElements) {
        let value = ''
        if (itemElement && typeof itemElement === 'object' && (itemElement as any)['#text'] !== undefined) {
          value = String((itemElement as any)['#text'])
        } else if (typeof itemElement === 'string') {
          value = itemElement
        } else if (typeof itemElement === 'number' || typeof itemElement === 'boolean') {
          // 处理 fast-xml-parser 将纯数字/布尔解析为非字符串的情况
          value = String(itemElement)
        }
        values.push(trimQuotes(value))
      }
    }

    // 获取或创建 ArrayItem
    let item = items.get(name) as ArrayItem
    if (!item) {
      item = new ArrayItem(name, translatable)
      items.set(name, item)
    }

    // 设置值
    item.setValue(language, values)
  }
}

/**
 * 去除字符串前后的引号
 */
function trimQuotes(str: string): string {
  if (!str) return str

  // 去除前后空白
  str = str.trim()

  // 去除前后的双引号
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1)
  }

  // 去除前后的单引号
  if (str.startsWith("'") && str.endsWith("'")) {
    str = str.slice(1, -1)
  }

  return str
}

/**
 * 验证 XML 格式
 */
export function validateXml(xmlContent: string): { valid: boolean; error?: string } {
  try {
    const parser = new XMLParser(PARSER_OPTIONS)
    const result = parser.parse(xmlContent)

    if (!result.resources) {
      return { valid: false, error: 'Missing <resources> root element' }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: error.message || 'Invalid XML format' }
  }
}

/**
 * 检查文件是否为字符串资源文件
 */
export function isStringResourceFile(fileName: string): boolean {
  const name = fileName.toLowerCase()
  return (
    (name.startsWith('strings') || name.startsWith('arrays')) &&
    name.endsWith('.xml')
  )
}
