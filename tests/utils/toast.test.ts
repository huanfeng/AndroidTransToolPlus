/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from '@/utils/toast'

// 模拟 Element Plus ElMessage
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

describe('toast 工具', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('success', () => {
    it('应该显示成功消息', () => {
      const { ElMessage } = require('element-plus')
      toast.success('操作成功')

      expect(ElMessage.success).toHaveBeenCalledWith({
        message: '操作成功',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })
  })

  describe('info', () => {
    it('应该显示信息消息', () => {
      const { ElMessage } = require('element-plus')
      toast.info('这是一条信息')

      expect(ElMessage.info).toHaveBeenCalledWith({
        message: '这是一条信息',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })
  })

  describe('warning', () => {
    it('应该显示警告消息', () => {
      const { ElMessage } = require('element-plus')
      toast.warning('这是警告')

      expect(ElMessage.warning).toHaveBeenCalledWith({
        message: '这是警告',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })
  })

  describe('error', () => {
    it('应该显示错误消息', () => {
      const { ElMessage } = require('element-plus')
      toast.error('操作失败')

      expect(ElMessage.error).toHaveBeenCalledWith({
        message: '操作失败',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })
  })

  describe('fromError', () => {
    it('应该从错误对象提取消息并显示', () => {
      const { ElMessage } = require('element-plus')
      const error = new Error('网络错误')
      toast.fromError(error)

      expect(ElMessage.error).toHaveBeenCalledWith({
        message: '网络错误',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })

    it('应该使用 err.msg 属性当存在时', () => {
      const { ElMessage } = require('element-plus')
      const error = { msg: '自定义错误消息' }
      toast.fromError(error)

      expect(ElMessage.error).toHaveBeenCalledWith({
        message: '自定义错误消息',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })

    it('应该使用备用消息当错误没有 message 或 msg 属性时', () => {
      const { ElMessage } = require('element-plus')
      const error = {}
      toast.fromError(error, '未知错误')

      expect(ElMessage.error).toHaveBeenCalledWith({
        message: '未知错误',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })

    it('应该使用 null 或 undefined 错误时使用备用消息', () => {
      const { ElMessage } = require('element-plus')
      toast.fromError(null, '默认错误')

      expect(ElMessage.error).toHaveBeenCalledWith({
        message: '默认错误',
        grouping: true,
        showClose: true,
        offset: 60,
      })
    })
  })
})
