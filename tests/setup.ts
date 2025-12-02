/**
 * Vitest 测试环境设置
 * 为所有测试提供全局配置和模拟
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'
import { config } from '@vue/test-utils'

// 组件测试后清理 DOM
afterEach(() => {
  cleanup()
})

// 全局错误处理模拟
console.error = (...args: unknown[]) => {
  throw new Error(`Console error: ${args.join(' ')}`)
}

// 模拟 scrollIntoView（Element Plus 使用）
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// 模拟 ResizeObserver（Element Plus 使用）
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
