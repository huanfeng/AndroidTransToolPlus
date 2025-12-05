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
 * 修复 XML 转义
 * Android strings.xml 的转义规则与标准 XML 不同：
 * - 不需要将单引号转义为 &apos;（保留用户输入的 \' 格式）
 * - 不需要将双引号转义为 &quot;（保留用户输入的 \" 格式）
 * - 仍然需要转义 &, <, > 等 XML 特殊字符
 */
function fixXmlEscaping(xml: string): string {
  // 将 &apos; 替换回 '
  // 将 &quot; 替换回 "
  // 注意：我们需要小心处理，避免影响已经存在的实体引用
  return xml.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
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

  // 修复转义：将 &apos; 和 &quot; 替换回引号
  const fixedXml = fixXmlEscaping(xml)

  // 添加 XML 声明
  return '<?xml version="1.0" encoding="utf-8"?>\n' + fixedXml
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
 * 处理 Android 特殊字符
 * 注意：XML 特殊字符（&, <, >）由 fast-xml-parser 自动处理
 * 这里只处理 Android 特有的转义
 */
function escapeXmlText(text: string): string {
  if (!text) return text

  // Android strings.xml 的特殊处理：
  // 1. 将实际换行符转换为字面量 \n（反斜杠+n）
  // 2. 将实际制表符转换为字面量 \t（反斜杠+t）
  // 3. 保留用户输入的引号格式，但未转义的单引号需要补上反斜杠
  // 4. XML 特殊字符（&, <, >）由 fast-xml-parser 自动处理后再通过 fixXmlEscaping 修正

  // 使用字符码明确表示反斜杠，避免转义混淆
  const backslash = String.fromCharCode(92)
  text = text.replace(/\n/g, backslash + 'n') // 实际换行符 -> 字面量\n
  text = text.replace(/\t/g, backslash + 't') // 实际制表符 -> 字面量\t
  text = text.replace(/\r/g, backslash + 'r') // 实际回车符 -> 字面量\r

  // Android 要求未转义的单引号使用反斜杠，否则会在编译时失败
  // 已有的 \' 保持不变，避免重复转义
  text = text.replace(/(^|[^\\])'/g, `$1${backslash}'`)

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

    // 修复转义
    const fixedXml = fixXmlEscaping(formatted)

    return '<?xml version="1.0" encoding="utf-8"?>\n' + fixedXml
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
