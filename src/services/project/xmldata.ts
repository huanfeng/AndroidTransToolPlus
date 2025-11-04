/**
 * XML 数据管理服务
 * 管理 Android 字符串资源的加载、解析和保存
 */

import type { DirectoryHandle, FileHandle } from '@/adapters/types'
import { getFileSystemAdapter } from '@/adapters'
import { Language, getLanguageByValuesDirName } from '@/models/language'
import type { ResItem } from '@/models/resource'
import { createResItem } from '@/models/resource'
import { parseXml } from '../xml/parser'
import { generateXml } from '../xml/generator'
import { getValuesDirs, fileExists, getOrCreateValuesDir } from './scanner'

/**
 * XML 文件数据
 */
export interface XmlFileData {
  fileName: string // 文件名（如 strings.xml）
  language: Language // 语言
  valuesDirName: string // values 目录名（如 values-zh-rCN）
  items: Map<string, ResItem> // 资源项
  fileHandle?: FileHandle // 文件句柄（如果文件存在）
}

/**
 * XML 数据管理类
 * 管理单个 res 目录下的所有 XML 文件
 */
export class XmlData {
  private resHandle: DirectoryHandle
  private relativePath: string
  private xmlFileNames: string[]
  private dataMap: Map<string, Map<Language, XmlFileData>> = new Map()
  private dirtyKeys: Set<string> = new Set()

  constructor(
    resHandle: DirectoryHandle,
    relativePath: string,
    xmlFileNames: string[]
  ) {
    this.resHandle = resHandle
    this.relativePath = relativePath
    this.xmlFileNames = xmlFileNames
  }

  /**
   * 获取 res 目录的相对路径
   */
  getRelativePath(): string {
    return this.relativePath
  }

  /**
   * 获取 XML 文件名列表
   */
  getXmlFileNames(): string[] {
    return [...this.xmlFileNames]
  }

  /**
   * 加载所有 XML 文件
   */
  async loadAll(): Promise<void> {
    const fs = getFileSystemAdapter()
    const valuesDirs = await getValuesDirs(this.resHandle)

    for (const fileName of this.xmlFileNames) {
      const languageDataMap = new Map<Language, XmlFileData>()

      for (const [valuesDirName, valuesHandle] of valuesDirs) {
        const language = getLanguageByValuesDirName(valuesDirName)
        if (!language) continue

        try {
          // 检查文件是否存在
          const exists = await fileExists(valuesHandle, fileName)
          if (!exists) {
            // 文件不存在，创建空数据
            languageDataMap.set(language, {
              fileName,
              language,
              valuesDirName,
              items: new Map(),
            })
            continue
          }

          // 读取文件
          const fileHandle = await valuesHandle.getFileHandle(fileName)
          const content = await fs.readFile(fileHandle)

          // 解析 XML
          const items = parseXml(content, language)

          languageDataMap.set(language, {
            fileName,
            language,
            valuesDirName,
            items,
            fileHandle,
          })
        } catch (error) {
          console.warn(
            `Failed to load ${valuesDirName}/${fileName}:`,
            error
          )
        }
      }

      if (languageDataMap.size > 0) {
        this.dataMap.set(fileName, languageDataMap)
      }
    }
  }

  /**
   * 按需加载单个 XML 文件（所有语言）
   */
  async loadFile(fileName: string): Promise<void> {
    const fs = getFileSystemAdapter()
    const valuesDirs = await getValuesDirs(this.resHandle)

    const languageDataMap = new Map<Language, XmlFileData>()

    for (const [valuesDirName, valuesHandle] of valuesDirs) {
      const language = getLanguageByValuesDirName(valuesDirName)
      if (!language) continue

      try {
        const exists = await fileExists(valuesHandle, fileName)
        if (!exists) {
          languageDataMap.set(language, {
            fileName,
            language,
            valuesDirName,
            items: new Map(),
          })
          continue
        }

        const fileHandle = await valuesHandle.getFileHandle(fileName)
        const content = await fs.readFile(fileHandle)
        const items = parseXml(content, language)

        languageDataMap.set(language, {
          fileName,
          language,
          valuesDirName,
          items,
          fileHandle,
        })
      } catch (error) {
        console.warn(`Failed to load ${valuesDirName}/${fileName}:`, error)
      }
    }

    if (languageDataMap.size > 0) {
      this.dataMap.set(fileName, languageDataMap)
    }
  }

  /**
   * 获取指定文件的所有语言数据
   */
  getFileData(fileName: string): Map<Language, XmlFileData> | undefined {
    return this.dataMap.get(fileName)
  }

  /**
   * 获取指定文件和语言的数据
   */
  getLanguageData(
    fileName: string,
    language: Language
  ): XmlFileData | undefined {
    return this.dataMap.get(fileName)?.get(language)
  }

  private makeDirtyKey(fileName: string, language: Language, itemName: string): string {
    return `${fileName}||${language}||${itemName}`
  }

  isDirty(fileName: string, language: Language, itemName: string): boolean {
    return this.dirtyKeys.has(this.makeDirtyKey(fileName, language, itemName))
  }

  hasDirty(fileName: string, language?: Language): boolean {
    const prefix = language ? `${fileName}||${language}||` : `${fileName}||`
    for (const k of this.dirtyKeys) {
      if (k.startsWith(prefix)) return true
    }
    return false
  }

  private clearDirtyFor(fileName: string, language: Language): void {
    const prefix = `${fileName}||${language}||`
    for (const k of Array.from(this.dirtyKeys)) {
      if (k.startsWith(prefix)) this.dirtyKeys.delete(k)
    }
  }

  /**
   * 合并所有文件的资源项（按资源名）
   * 返回所有资源项的合并视图
   */
  mergeAllItems(): Map<string, ResItem> {
    const merged = new Map<string, ResItem>()

    // 遍历所有文件
    for (const [_fileName, languageDataMap] of this.dataMap) {
      // 获取默认语言数据作为基准
      const defaultData = languageDataMap.get(Language.DEF)
      if (!defaultData) continue

      // 遍历默认语言的所有资源项
      for (const [itemName, item] of defaultData.items) {
        // 如果已存在，跳过（优先使用第一个文件中的定义）
        if (merged.has(itemName)) continue

        // 克隆资源项
        const mergedItem = item.clone()

        // 合并其他语言的值
        for (const [language, data] of languageDataMap) {
          if (language === Language.DEF) continue

          const otherItem = data.items.get(itemName)
          if (otherItem) {
            const value = otherItem.valueMap.get(language)
            if (value !== undefined) {
              mergedItem.valueMap.set(language, value)
            }
          }
        }

        merged.set(itemName, mergedItem)
      }
    }

    return merged
  }

  /**
   * 更新指定资源项的值
   */
  updateItem(
    fileName: string,
    itemName: string,
    language: Language,
    value: string | string[]
  ): void {
    const languageDataMap = this.dataMap.get(fileName)
    if (!languageDataMap) return

    const data = languageDataMap.get(language)
    if (!data) return

    let item = data.items.get(itemName)
    if (!item) {
      // 如果目标语言不存在该项，则按照默认语言的类型和 translatable 创建
      const defItem = languageDataMap.get(Language.DEF)?.items.get(itemName)
      if (defItem) {
        item = createResItem(defItem.type, defItem.name, defItem.translatable)
        data.items.set(itemName, item)
      }
    }

    if (item) {
      item.setValue(language, value)
      this.dirtyKeys.add(this.makeDirtyKey(fileName, language, itemName))
    }
  }

  /**
   * 保存指定文件的指定语言数据
   */
  async saveFile(fileName: string, language: Language): Promise<void> {
    const languageDataMap = this.dataMap.get(fileName)
    if (!languageDataMap) {
      throw new Error(`File not found: ${fileName}`)
    }

    const data = languageDataMap.get(language)
    if (!data) {
      throw new Error(`Language data not found: ${fileName} - ${language}`)
    }

    const fs = getFileSystemAdapter()

    // 获取默认语言数据（用于排序）
    const defaultData = languageDataMap.get(Language.DEF)

    // 生成 XML
    const xmlContent = generateXml(
      data.items,
      language,
      defaultData?.items
    )

    // 获取或创建 values 目录
    const valuesHandle = await getOrCreateValuesDir(
      this.resHandle,
      data.valuesDirName
    )

    // 写入文件
    if (data.fileHandle) {
      // 文件已存在，直接写入
      await fs.writeFile(data.fileHandle, xmlContent)
    } else {
      // 文件不存在，创建新文件
      const fileHandle = await fs.createFile(
        valuesHandle,
        fileName,
        xmlContent
      )
      data.fileHandle = fileHandle
    }

    // 清除对应语言的脏标记
    this.clearDirtyFor(fileName, language)
  }

  /**
   * 保存所有文件
   */
  async saveAll(languages?: Language[]): Promise<void> {
    const targetLanguages = languages || [
      Language.DEF,
      Language.CN,
      Language.CN_HK,
      Language.CN_TW,
      Language.AR,
      Language.DE,
      Language.FR,
      Language.HI,
      Language.IT,
      Language.IW,
      Language.JA,
      Language.KO,
      Language.RU,
      Language.UK,
    ]

    const errors: Array<{ file: string; language: Language; error: any }> = []

    for (const fileName of this.xmlFileNames) {
      for (const language of targetLanguages) {
        try {
          await this.saveFile(fileName, language)
        } catch (error) {
          console.error(
            `Failed to save ${fileName} for ${language}:`,
            error
          )
          errors.push({ file: fileName, language, error })
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Failed to save ${errors.length} files: ${errors
          .map(e => `${e.file}(${e.language})`)
          .join(', ')}`
      )
    }
  }

  /**
   * 重新加载指定文件
   */
  async reloadFile(fileName: string): Promise<void> {
    const fs = getFileSystemAdapter()
    const valuesDirs = await getValuesDirs(this.resHandle)
    const languageDataMap = this.dataMap.get(fileName)

    if (!languageDataMap) return

    for (const [valuesDirName, _valuesHandle] of valuesDirs) {
      const language = getLanguageByValuesDirName(valuesDirName)
      if (!language) continue

      const data = languageDataMap.get(language)
      if (!data || !data.fileHandle) continue

      try {
        const content = await fs.readFile(data.fileHandle)
        const items = parseXml(content, language)
        data.items = items
      } catch (error) {
        console.warn(
          `Failed to reload ${valuesDirName}/${fileName}:`,
          error
        )
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalFiles: number
    totalItems: number
    translatedCount: Map<Language, number>
    missingCount: Map<Language, number>
  } {
    const mergedItems = this.mergeAllItems()
    const translatedCount = new Map<Language, number>()
    const missingCount = new Map<Language, number>()

    // 初始化计数器
    const languages = [
      Language.DEF,
      Language.CN,
      Language.CN_HK,
      Language.CN_TW,
      Language.AR,
      Language.DE,
      Language.FR,
      Language.HI,
      Language.IT,
      Language.IW,
      Language.JA,
      Language.KO,
      Language.RU,
      Language.UK,
    ]

    for (const lang of languages) {
      translatedCount.set(lang, 0)
      missingCount.set(lang, 0)
    }

    // 统计每个资源项
    for (const item of mergedItems.values()) {
      // 跳过不可翻译的项
      if (!item.translatable) continue

      for (const lang of languages) {
        const value = item.valueMap.get(lang)
        if (value !== undefined && value !== null && value !== '') {
          translatedCount.set(lang, (translatedCount.get(lang) || 0) + 1)
        } else {
          missingCount.set(lang, (missingCount.get(lang) || 0) + 1)
        }
      }
    }

    return {
      totalFiles: this.xmlFileNames.length,
      totalItems: mergedItems.size,
      translatedCount,
      missingCount,
    }
  }

  /**
   * 导出为 JSON（用于调试或备份）
   */
  exportToJson(): string {
    const data: any = {
      relativePath: this.relativePath,
      files: {},
    }

    for (const [fileName, languageDataMap] of this.dataMap) {
      data.files[fileName] = {}

      for (const [language, fileData] of languageDataMap) {
        const items: any = {}
        for (const [name, item] of fileData.items) {
          items[name] = {
            type: item.type,
            translatable: item.translatable,
            value: item.valueMap.get(language),
          }
        }
        data.files[fileName][language] = items
      }
    }

    return JSON.stringify(data, null, 2)
  }
}
