#!/usr/bin/env node
/**
 * 跨平台清理脚本
 * 自动检测并删除指定的目录
 */

import { rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 要清理的目录列表
const dirsToClean = {
  dist: join(__dirname, 'dist'),
  distSsr: join(__dirname, 'dist-ssr'),
  tauriTarget: join(__dirname, 'src-tauri', 'target'),
  nodeModules: join(__dirname, 'node_modules'),
}

// 检查并删除目录
function cleanDirectory(dirPath, dirName) {
  try {
    rmSync(dirPath, { recursive: true, force: true })
    console.log(`✅ Cleaned: ${dirName}`)
    return true
  } catch (error) {
    console.log(`ℹ️  Skipped: ${dirName} (not found or not removable)`)
    return false
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2)
  let cleanedCount = 0

  console.log('🧹 Cleaning build artifacts...\n')

  if (args.includes('--all')) {
    // 清理所有
    Object.entries(dirsToClean).forEach(([key, path]) => {
      if (cleanDirectory(path, key)) {
        cleanedCount++
      }
    })
  } else if (args.includes('--tauri')) {
    // 只清理 Tauri
    if (cleanDirectory(dirsToClean.tauriTarget, 'tauri/target')) {
      cleanedCount++
    }
  } else {
    // 默认清理 dist 目录
    if (cleanDirectory(dirsToClean.dist, 'dist')) {
      cleanedCount++
    }
    if (cleanDirectory(dirsToClean.distSsr, 'dist-ssr')) {
      cleanedCount++
    }
  }

  console.log(`\n✨ Clean complete! (${cleanedCount} directories removed)`)
}

// 运行主函数
main()
