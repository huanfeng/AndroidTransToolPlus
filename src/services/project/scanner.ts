/**
 * 项目扫描服务
 * 扫描 Android 项目的 res 目录和资源文件
 */

import type { DirectoryHandle } from '@/adapters/types'
import { isStringResourceFile } from '../xml/parser'

/**
 * 资源目录信息
 */
export interface ResDirInfo {
  relativePath: string // 相对于项目根目录的路径
  dirHandle: DirectoryHandle // 目录句柄
  xmlFileNames: string[] // XML 文件名列表
}

/**
 * 扫描配置
 */
export interface ScanOptions {
  ignoreDirs?: string[] // 忽略的目录
  maxDepth?: number // 最大扫描深度
}

/**
 * 默认扫描配置
 */
const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  ignoreDirs: ['build', '.gradle', '.idea', 'node_modules', '.git', 'gradle'],
  maxDepth: 10,
}

/**
 * 扫描项目中的所有 res 目录
 */
export async function scanProjectResDirs(
  projectHandle: DirectoryHandle,
  options: ScanOptions = {}
): Promise<ResDirInfo[]> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options }
  const resDirs: ResDirInfo[] = []

  await scanDirectory(projectHandle, '', resDirs, opts, 0)

  return resDirs
}

/**
 * 递归扫描目录
 */
async function scanDirectory(
  dirHandle: DirectoryHandle,
  relativePath: string,
  resDirs: ResDirInfo[],
  options: ScanOptions,
  depth: number
): Promise<void> {
  // 检查深度限制
  if (depth > (options.maxDepth || 10)) {
    return
  }

  try {
    for await (const [name, handle] of dirHandle.entries()) {
      // 跳过非目录
      if (handle.kind !== 'directory') continue

      // 跳过忽略的目录
      if (options.ignoreDirs?.includes(name)) {
        continue
      }

      const currentPath = relativePath ? `${relativePath}/${name}` : name

      // 如果是 res 目录，扫描其内容
      if (name === 'res') {
        const resInfo = await scanResDir(handle as DirectoryHandle, currentPath)
        if (resInfo.xmlFileNames.length > 0) {
          resDirs.push(resInfo)
        }
      } else {
        // 继续递归扫描
        await scanDirectory(handle as DirectoryHandle, currentPath, resDirs, options, depth + 1)
      }
    }
  } catch (error) {
    console.warn(`Failed to scan directory ${relativePath}:`, error)
  }
}

/**
 * 扫描 res 目录
 */
async function scanResDir(resHandle: DirectoryHandle, relativePath: string): Promise<ResDirInfo> {
  const xmlFileNames = new Set<string>()

  try {
    for await (const [name, handle] of resHandle.entries()) {
      // 只处理 values* 目录
      if (handle.kind !== 'directory' || !name.startsWith('values')) {
        continue
      }

      const valuesHandle = handle as DirectoryHandle

      // 扫描 values 目录中的 XML 文件
      try {
        for await (const [fileName, fileHandle] of valuesHandle.entries()) {
          if (fileHandle.kind === 'file' && isStringResourceFile(fileName)) {
            xmlFileNames.add(fileName)
          }
        }
      } catch (error) {
        console.warn(`Failed to scan values directory ${name}:`, error)
      }
    }
  } catch (error) {
    console.warn(`Failed to scan res directory ${relativePath}:`, error)
  }

  return {
    relativePath,
    dirHandle: resHandle,
    xmlFileNames: Array.from(xmlFileNames).sort(),
  }
}

/**
 * 获取 res 目录下的所有 values 目录
 */
export async function getValuesDirs(
  resHandle: DirectoryHandle
): Promise<Map<string, DirectoryHandle>> {
  const valuesDirs = new Map<string, DirectoryHandle>()

  try {
    for await (const [name, handle] of resHandle.entries()) {
      if (handle.kind === 'directory' && name.startsWith('values')) {
        valuesDirs.set(name, handle as DirectoryHandle)
      }
    }
  } catch (error) {
    console.error('Failed to get values directories:', error)
  }

  return valuesDirs
}

/**
 * 检查文件是否存在
 */
export async function fileExists(dirHandle: DirectoryHandle, fileName: string): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(fileName)
    return true
  } catch {
    return false
  }
}

/**
 * 获取或创建 values 目录
 */
export async function getOrCreateValuesDir(
  resHandle: DirectoryHandle,
  valuesDirName: string
): Promise<DirectoryHandle> {
  try {
    return await resHandle.getDirectoryHandle(valuesDirName)
  } catch {
    // 目录不存在，创建它
    return await resHandle.getDirectoryHandle(valuesDirName, { create: true })
  }
}
