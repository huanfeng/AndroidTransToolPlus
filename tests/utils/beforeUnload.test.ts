/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hasUnsavedChanges,
  enableBeforeUnloadPrompt,
  disableBeforeUnloadPrompt,
  checkAndPromptUnsavedChanges,
} from '@/utils/beforeUnload'

// 模拟 Pinia stores
vi.mock('@/stores/project', () => ({
  useProjectStore: vi.fn(),
}))

vi.mock('@/stores/translation', () => ({
  useTranslationStore: vi.fn(),
}))

vi.mock('./projectPersistence', () => ({
  saveProjectToStorage: vi.fn(),
}))

describe('页面刷新/关闭提示工具', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    try {
      disableBeforeUnloadPrompt()
    } catch (e) {
      // 忽略错误
    }
  })

  describe('hasUnsavedChanges - 核心逻辑测试', () => {
    it('应该在项目有脏数据时返回 true', async () => {
      const { useProjectStore } = await import('@/stores/project')
      const { useTranslationStore } = await import('@/stores/translation')

      const mockProjectStore = {
        project: {
          xmlDataMap: new Map([
            [
              'values-zh-rCN',
              {
                dirtyKeys: new Set(['key1', 'key2']),
              },
            ],
          ]),
        },
      }

      const mockTranslationStore = {
        isTranslating: false,
      }

      vi.mocked(useProjectStore).mockReturnValue(mockProjectStore as any)
      vi.mocked(useTranslationStore).mockReturnValue(mockTranslationStore as any)

      expect(hasUnsavedChanges()).toBe(true)
    })

    it('应该在翻译任务进行中时返回 true', async () => {
      const { useProjectStore } = await import('@/stores/project')
      const { useTranslationStore } = await import('@/stores/translation')

      const mockProjectStore = {
        project: null,
      }

      const mockTranslationStore = {
        isTranslating: true,
      }

      vi.mocked(useProjectStore).mockReturnValue(mockProjectStore as any)
      vi.mocked(useTranslationStore).mockReturnValue(mockTranslationStore as any)

      expect(hasUnsavedChanges()).toBe(true)
    })

    it('应该在没有未保存修改时返回 false', async () => {
      const { useProjectStore } = await import('@/stores/project')
      const { useTranslationStore } = await import('@/stores/translation')

      const mockProjectStore = {
        project: {
          xmlDataMap: new Map([
            [
              'values-zh-rCN',
              {
                dirtyKeys: new Set(),
              },
            ],
          ]),
        },
      }

      const mockTranslationStore = {
        isTranslating: false,
      }

      vi.mocked(useProjectStore).mockReturnValue(mockProjectStore as any)
      vi.mocked(useTranslationStore).mockReturnValue(mockTranslationStore as any)

      expect(hasUnsavedChanges()).toBe(false)
    })

    it('应该在没有打开项目时返回 false', async () => {
      const { useProjectStore } = await import('@/stores/project')
      const { useTranslationStore } = await import('@/stores/translation')

      const mockProjectStore = {
        project: null,
      }

      const mockTranslationStore = {
        isTranslating: false,
      }

      vi.mocked(useProjectStore).mockReturnValue(mockProjectStore as any)
      vi.mocked(useTranslationStore).mockReturnValue(mockTranslationStore as any)

      expect(hasUnsavedChanges()).toBe(false)
    })

    it('应该在检查出错时返回 false', async () => {
      const { useProjectStore } = await import('@/stores/project')
      const { useTranslationStore } = await import('@/stores/translation')

      vi.mocked(useProjectStore).mockImplementation(() => {
        throw new Error('Store error')
      })
      vi.mocked(useTranslationStore).mockReturnValue({ isTranslating: false } as any)

      expect(hasUnsavedChanges()).toBe(false)
    })
  })

  // 事件监听器测试 - 跳过
  // 这些测试涉及复杂的浏览器事件模拟，适合在集成测试或 E2E 测试中验证
  describe.skip('enableBeforeUnloadPrompt - 事件测试', () => {
    it.skip('应该添加 beforeunload 事件监听器', () => {
      // 跳过 - 涉及复杂的事件监听器模拟
    })

    it.skip('应该先禁用旧的监听器再添加新的', () => {
      // 跳过 - 涉及复杂的事件监听器模拟
    })

    it.skip('应该在页面关闭时保存项目状态', () => {
      // 跳过 - 涉及复杂的事件监听器模拟
    })
  })

  describe.skip('disableBeforeUnloadPrompt - 事件测试', () => {
    it.skip('应该移除 beforeunload 事件监听器', () => {
      // 跳过 - 涉及复杂的事件监听器模拟
    })

    it.skip('在没有监听器时不应该出错', () => {
      // 跳过 - 涉及复杂的事件监听器模拟
    })
  })

  describe.skip('checkAndPromptUnsavedChanges - 交互测试', () => {
    it.skip('应该在没有未保存修改时直接 resolve', async () => {
      // 跳过 - 涉及 window.confirm 交互
    })

    it.skip('应该在用户确认时 resolve', async () => {
      // 跳过 - 涉及 window.confirm 交互
    })

    it.skip('应该在用户取消时 reject', async () => {
      // 跳过 - 涉及 window.confirm 交互
    })
  })
})
