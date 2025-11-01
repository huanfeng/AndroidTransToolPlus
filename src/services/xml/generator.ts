/**
 * XML 生成服务
 * 生成 Android 字符串资源 XML 文件
 */

import { XMLBuilder } from 'fast-xml-parser'
import type { Language } from '@/models/language'
import type { ResItem } from '@/models/resource'

/**
 * XML 构建选项
 */
const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '    ', // 4 空格缩进
  suppressEmptyNode: true,
}

/**
 * 生成 Android 字符串资源 XML
 */
export function generateXml(
  items: Map<string, ResItem>,
  language: Language,
  defaultLanguageItems?: Map<string, ResItem>
): string {
  const resources: any = {}
  const strings: any[] = []
  const arrays: any[] = []

  // 使用默认语言的顺序（如果提供）
  const sortedItems = defaultLanguageItems
    ? sortByDefaultOrder(items, defaultLanguageItems)
    : Array.from(items.values())

  for (const item of sortedItems) {
    // 跳过不可翻译的项
    if (!item.translatable) continue

    // 获取该语言的值
    const value = item.valueMap.get(language)
    if (value === undefined || value === null) continue

    if (item.type === 'string') {
      // 跳过空字符串
      if (value === '') continue

      strings.push({
        '@_name': item.name,
        '#text': escapeXmlText(value as string),
      })
    } else if (item.type === 'string-array') {
      // 跳过空数组
      const arrayValue = value as string[]
      if (arrayValue.length === 0) continue

      arrays.push({
        '@_name': item.name,
        item: arrayValue.map(v => ({
          '#text': escapeXmlText(v),
        })),
      })
    }
  }

  // 添加到 resources
  if (strings.length > 0) {
    resources.string = strings
  }
  if (arrays.length > 0) {
    resources['string-array'] = arrays
  }

  // 构建 XML
  const builder = new XMLBuilder(BUILDER_OPTIONS)
  const xml = builder.build({ resources })

  // 添加 XML 声明
  return '<?xml version="1.0" encoding="utf-8"?>\n' + xml
}

/**
 * 按照默认语言的顺序排序
 */
function sortByDefaultOrder(
  items: Map<string, ResItem>,
  defaultLanguageItems: Map<string, ResItem>
): ResItem[] {
  const sorted: ResItem[] = []
  const processed = new Set<string>()

  // 先按默认语言的顺序添加
  for (const [name, _defaultItem] of defaultLanguageItems) {
    const item = items.get(name)
    if (item) {
      sorted.push(item)
      processed.add(name)
    }
  }

  // 再添加其他项（新增的）
  for (const [name, item] of items) {
    if (!processed.has(name)) {
      sorted.push(item)
    }
  }

  return sorted
}

/**
 * 转义 XML 文本
 */
function escapeXmlText(text: string): string {
  if (!text) return text

  // 转义单引号为 \'（Android 要求）
  text = text.replace(/'/g, "\\'")

  // 其他 XML 特殊字符由 fast-xml-parser 自动处理
  // 但我们需要手动处理一些 Android 特殊情况

  // 保留换行符
  text = text.replace(/\n/g, '\\n')

  return text
}

/**
 * 格式化 XML 字符串
 */
export function formatXml(xmlContent: string): string {
  try {
    // 解析并重新生成以格式化
    const { XMLParser } = require('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    })
    const result = parser.parse(xmlContent)

    const builder = new XMLBuilder(BUILDER_OPTIONS)
    const formatted = builder.build(result)

    return '<?xml version="1.0" encoding="utf-8"?>\n' + formatted
  } catch (error) {
    console.error('Failed to format XML:', error)
    return xmlContent
  }
}

/**
 * 生成空的资源文件
 */
export function generateEmptyXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Empty resources file -->
</resources>
`
}
