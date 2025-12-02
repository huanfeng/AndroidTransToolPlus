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
    // 清理事件监听器
    window.removeEventListener = vi.fn()
    window.addEventListener = vi.fn()
  })

  afterEach(() => {
    disableBeforeUnloadPrompt()
  })

  describe('hasUnsavedChanges', () => {
    it('应该在项目有脏数据时返回 true', () => {
      const { useProjectStore } = require('@/stores/project')
      const { useTranslationStore } = require('@/stores/translation')

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

      useProjectStore.mockReturnValue(mockProjectStore)
      useTranslationStore.mockReturnValue(mockTranslationStore)

      expect(hasUnsavedChanges()).toBe(true)
    })

    it('应该在翻译任务进行中时返回 true', () => {
      const { useProjectStore } = require('@/stores/project')
      const { useTranslationStore } = require('@/stores/translation')

      const mockProjectStore = {
        project: null,
      }

      const mockTranslationStore = {
        isTranslating: true,
      }

      useProjectStore.mockReturnValue(mockProjectStore)
      useTranslationStore.mockReturnValue(mockTranslationStore)

      expect(hasUnsavedChanges()).toBe(true)
    })

    it('应该在没有未保存修改时返回 false', () => {
      const { useProjectStore } = require('@/stores/project')
      const { useTranslationStore } = require('@/stores/translation')

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

      useProjectStore.mockReturnValue(mockProjectStore)
      useTranslationStore.mockReturnValue(mockTranslationStore)

      expect(hasUnsavedChanges()).toBe(false)
    })

    it('应该在没有打开项目时返回 false', () => {
      const { useProjectStore } = require('@/stores/project')
      const { useTranslationStore } = require('@/stores/translation')

      const mockProjectStore = {
        project: null,
      }

      const mockTranslationStore = {
        isTranslating: false,
      }

      useProjectStore.mockReturnValue(mockProjectStore)
      useTranslationStore.mockReturnValue(mockTranslationStore)

      expect(hasUnsavedChanges()).toBe(false)
    })

    it('应该在检查出错时返回 false', () => {
      const { useProjectStore } = require('@/stores/project')
      const { useTranslationStore } = require('@/stores/translation')

      useProjectStore.mockImplementation(() => {
        throw new Error('Store error')
      })
      useTranslationStore.mockReturnValue({ isTranslating: false })

      expect(hasUnsavedChanges()).toBe(false)
    })
  })

  describe('enableBeforeUnloadPrompt', () => {
    it('应该添加 beforeunload 事件监听器', () => {
      enableBeforeUnloadPrompt()

      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )
    })

    it('应该先禁用旧的监听器再添加新的', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      enableBeforeUnloadPrompt()
      enableBeforeUnloadPrompt() // 再次调用

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('应该在页面关闭时保存项目状态', () => {
      const { useProjectStore } = require('@/stores/project')
      const { saveProjectToStorage } = require('./projectPersistence')

      const mockProjectStore = {
        project: {
          name: 'TestProject',
          path: '/test',
        },
        selectedResDir: 'values-zh-rCN',
        selectedXmlFile: 'strings.xml',
      }

      useProjectStore.mockReturnValue(mockProjectStore)

      enableBeforeUnloadPrompt()

      // 获取传入的事件监听器
      const listenerCall = vi.mocked(window.addEventListener).mock.calls[0]
      const listener = listenerCall[1] as (event: BeforeUnloadEvent) => void

      // 模拟有未保存的修改
      const mockHasUnsavedChanges = vi
        .fn()
        .mockReturnValue(true)
        .mockImplementationOnce(hasUnsavedChanges)

      vi.mocked(hasUnsavedChanges).mockImplementation(mockHasUnsavedChanges)

      const event = new Event('beforeunload') as BeforeUnloadEvent
      listener(event)

      expect(saveProjectToStorage).toHaveBeenCalledWith({
        name: 'TestProject',
        path: '/test',
        selectedResDir: 'values-zh-rCN',
        selectedXmlFile: 'strings.xml',
        timestamp: expect.any(Number),
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.returnValue).toBe('您有未保存的修改，确定要离开吗？')
    })
  })

  describe('disableBeforeUnloadPrompt', () => {
    it('应该移除 beforeunload 事件监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      enableBeforeUnloadPrompt()
      disableBeforeUnloadPrompt()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })

    it('在没有监听器时不应该出错', () => {
      expect(() => disableBeforeUnloadPrompt()).not.toThrow()
    })
  })

  describe('checkAndPromptUnsavedChanges', () => {
    it('应该在没有未保存修改时直接 resolve', async () => {
      const mockHasUnsavedChanges = vi
        .fn()
        .mockReturnValue(false)
        .mockImplementationOnce(hasUnsavedChanges)

      vi.mocked(hasUnsavedChanges).mockImplementation(mockHasUnsavedChanges)

      await expect(checkAndPromptUnsavedChanges()).resolves.toBeUndefined()
    })

    it('应该在用户确认时 resolve', async () => {
      const mockHasUnsavedChanges = vi
        .fn()
        .mockReturnValue(true)
        .mockImplementationOnce(hasUnsavedChanges)

      vi.mocked(hasUnsavedChanges).mockImplementation(mockHasUnsavedChanges)

      // 模拟用户点击确认
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

      await expect(checkAndPromptUnsavedChanges()).resolves.toBeUndefined()

      expect(window.confirm).toHaveBeenCalledWith(
        '您有未保存的修改，确定要继续吗？\n\n未保存的修改将会丢失。'
      )
    })

    it('应该在用户取消时 reject', async () => {
      const mockHasUnsavedChanges = vi
        .fn()
        .mockReturnValue(true)
        .mockImplementationOnce(hasUnsavedChanges)

      vi.mocked(hasUnsavedChanges).mockImplementation(mockHasUnsavedChanges)

      // 模拟用户点击取消
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))

      await expect(checkAndPromptUnsavedChanges()).rejects.toThrow('User cancelled')

      expect(window.confirm).toHaveBeenCalled()
    })
  })
})
