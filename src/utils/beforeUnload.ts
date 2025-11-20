/**
 * 页面刷新/关闭提示工具
 */

import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { saveProjectToStorage } from './projectPersistence'

let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null

/**
 * 检查是否有未保存的修改
 */
export function hasUnsavedChanges(): boolean {
  try {
    const projectStore = useProjectStore()
    const translationStore = useTranslationStore()

    // 检查项目是否有脏数据
    if (projectStore.project) {
      for (const xmlData of projectStore.project.xmlDataMap.values()) {
        if (xmlDataHasDirty(xmlData)) {
          return true
        }
      }
    }

    // 检查翻译任务是否正在进行
    if (translationStore.isTranslating) {
      return true
    }

    return false
  } catch (err) {
    // 如果出现错误（比如在初始化阶段），不阻止关闭
    console.warn('Error checking unsaved changes:', err)
    return false
  }
}

/**
 * 检查单个 XmlData 是否有脏数据
 */
function xmlDataHasDirty(xmlData: any): boolean {
  // 访问脏键集合
  if (xmlData.dirtyKeys && xmlData.dirtyKeys.size > 0) {
    return true
  }

  // 如果没有脏键集合，通过其他方式检查
  // 这里需要根据实际的 XmlData 实现来调整
  return false
}

/**
 * 启用页面刷新/关闭提示
 */
export function enableBeforeUnloadPrompt(): void {
  // 如果已经启用，先移除
  disableBeforeUnloadPrompt()

  beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    try {
      // 保存当前项目状态
      const projectStore = useProjectStore()
      if (projectStore.project) {
        saveProjectToStorage({
          name: projectStore.project.name,
          path: projectStore.project.path,
          selectedResDir: projectStore.selectedResDir,
          selectedXmlFile: projectStore.selectedXmlFile,
          timestamp: Date.now(),
        })
      }

      if (hasUnsavedChanges()) {
        const message = '您有未保存的修改，确定要离开吗？'

        // 标准方式
        event.preventDefault()
        // 兼容性处理
        event.returnValue = message

        return message
      }
    } catch (err) {
      // 静默处理错误
      console.warn('Error in beforeUnload handler:', err)
    }
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)
}

/**
 * 禁用页面刷新/关闭提示
 */
export function disableBeforeUnloadPrompt(): void {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
}

/**
 * 手动检查并提示用户
 * 返回 Promise，resolve 表示继续，reject 表示取消
 */
export async function checkAndPromptUnsavedChanges(): Promise<void> {
  if (hasUnsavedChanges()) {
    const confirmed = window.confirm(
      '您有未保存的修改，确定要继续吗？\n\n未保存的修改将会丢失。'
    )
    if (!confirmed) {
      throw new Error('User cancelled')
    }
  }
}
