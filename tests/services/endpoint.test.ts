/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeApiBaseUrl,
  buildBaseUrlCandidates,
  classifyApiError,
  extractErrorMessage,
  parseModelList,
  isLikelyChatModel,
  sortModels,
  diagnoseEndpoint,
} from '@/services/translation/endpoint'

/** 构造一个形似 axios 的 HTTP 错误 */
function httpError(status: number, data?: any) {
  return { isAxiosError: true, response: { status, data }, message: `Request failed ${status}` }
}

describe('端点探测', () => {
  describe('normalizeApiBaseUrl', () => {
    it('应该保持规范的 URL 不变', () => {
      expect(normalizeApiBaseUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1')
    })

    it('应该补上缺失的协议头', () => {
      expect(normalizeApiBaseUrl('api.deepseek.com/v1')).toBe('https://api.deepseek.com/v1')
    })

    it('应该给本地地址补 http 而非 https', () => {
      expect(normalizeApiBaseUrl('localhost:11434/v1')).toBe('http://localhost:11434/v1')
      expect(normalizeApiBaseUrl('127.0.0.1:8000')).toBe('http://127.0.0.1:8000')
    })

    it('应该去掉末尾斜杠', () => {
      expect(normalizeApiBaseUrl('https://api.openai.com/v1//')).toBe('https://api.openai.com/v1')
    })

    it('应该剥掉误填的完整端点路径', () => {
      expect(normalizeApiBaseUrl('https://api.openai.com/v1/chat/completions')).toBe(
        'https://api.openai.com/v1'
      )
      expect(normalizeApiBaseUrl('https://api.openai.com/v1/models')).toBe(
        'https://api.openai.com/v1'
      )
    })

    it('应该去掉 query 与 hash', () => {
      expect(normalizeApiBaseUrl('https://api.openai.com/v1?key=abc#frag')).toBe(
        'https://api.openai.com/v1'
      )
    })

    it('应该对空输入返回空串', () => {
      expect(normalizeApiBaseUrl('')).toBe('')
      expect(normalizeApiBaseUrl('   ')).toBe('')
    })

    it('应该原样保留同源相对路径（走代理绕开 CORS 的场景）', () => {
      expect(normalizeApiBaseUrl('/api-proxy/v1')).toBe('/api-proxy/v1')
      expect(normalizeApiBaseUrl('/api-proxy/v1/')).toBe('/api-proxy/v1')
      expect(normalizeApiBaseUrl('/api-proxy/v1/chat/completions')).toBe('/api-proxy/v1')
    })
  })

  describe('buildBaseUrlCandidates', () => {
    it('只填域名时应该优先尝试 /v1', () => {
      expect(buildBaseUrlCandidates('https://api.openai.com')).toEqual([
        'https://api.openai.com/v1',
        'https://api.openai.com',
      ])
    })

    it('已带版本段时应该优先用原样，并保留去版本的兜底', () => {
      expect(buildBaseUrlCandidates('https://api.openai.com/v1')).toEqual([
        'https://api.openai.com/v1',
        'https://api.openai.com',
      ])
    })

    it('应该识别非 v1 的版本段', () => {
      const candidates = buildBaseUrlCandidates('https://example.com/compatible-mode')
      expect(candidates[0]).toBe('https://example.com/compatible-mode')
    })

    it('应该对空输入返回空数组', () => {
      expect(buildBaseUrlCandidates('')).toEqual([])
    })

    it('相对路径不应该被猜测版本段', () => {
      expect(buildBaseUrlCandidates('/api-proxy/v1')).toEqual(['/api-proxy/v1'])
      expect(buildBaseUrlCandidates('/api-proxy')).toEqual(['/api-proxy'])
    })
  })

  describe('classifyApiError', () => {
    it('应该识别取消', () => {
      expect(classifyApiError({ name: 'CanceledError' }).kind).toBe('cancelled')
      expect(classifyApiError({ code: 'ERR_CANCELED' }).kind).toBe('cancelled')
    })

    it('应该识别超时', () => {
      expect(classifyApiError({ code: 'ECONNABORTED' }).kind).toBe('timeout')
    })

    it('没有响应时应该归为网络问题（含 CORS）', () => {
      expect(classifyApiError({ message: 'Network Error' }).kind).toBe('network')
    })

    it('应该识别鉴权失败', () => {
      expect(classifyApiError(httpError(401)).kind).toBe('auth')
      expect(classifyApiError(httpError(403)).kind).toBe('auth')
    })

    it('应该识别限流与服务端错误', () => {
      expect(classifyApiError(httpError(429)).kind).toBe('rateLimit')
      expect(classifyApiError(httpError(503)).kind).toBe('server')
    })

    it('404 默认是路径不存在', () => {
      expect(classifyApiError(httpError(404, { error: { message: 'Not Found' } })).kind).toBe(
        'notFound'
      )
    })

    it('404 但错误文案指向模型时应该归为模型不存在', () => {
      const error = httpError(404, { error: { message: 'The model `gpt-9` does not exist' } })
      expect(classifyApiError(error).kind).toBe('modelNotFound')
    })

    it('400 且文案指向模型时应该归为模型不存在', () => {
      const error = httpError(400, { error: { message: 'Invalid model specified' } })
      expect(classifyApiError(error).kind).toBe('modelNotFound')
    })

    it('应该带上状态码与服务端错误信息', () => {
      const result = classifyApiError(httpError(401, { error: { message: 'Invalid API key' } }))
      expect(result.status).toBe(401)
      expect(result.detail).toBe('Invalid API key')
    })
  })

  describe('extractErrorMessage', () => {
    it('应该读取 OpenAI 风格的错误结构', () => {
      expect(extractErrorMessage(httpError(400, { error: { message: 'bad request' } }))).toBe(
        'bad request'
      )
    })

    it('应该兼容其它常见字段', () => {
      expect(extractErrorMessage(httpError(400, { message: 'oops' }))).toBe('oops')
      expect(extractErrorMessage(httpError(400, { detail: 'nope' }))).toBe('nope')
    })

    it('应该兼容纯字符串响应体', () => {
      expect(extractErrorMessage(httpError(500, 'Internal Server Error'))).toBe(
        'Internal Server Error'
      )
    })

    it('无响应体时应该回退到 error.message', () => {
      expect(extractErrorMessage({ message: 'Network Error' })).toBe('Network Error')
    })
  })

  describe('parseModelList', () => {
    it('应该解析 OpenAI 标准结构', () => {
      const models = parseModelList({ object: 'list', data: [{ id: 'gpt-4o' }, { id: 'gpt-5' }] })
      expect(models).toEqual(['gpt-4o', 'gpt-5'])
    })

    it('应该兼容直接返回数组', () => {
      expect(parseModelList([{ id: 'a' }, { id: 'b' }])).toEqual(['a', 'b'])
    })

    it('应该兼容字符串数组', () => {
      expect(parseModelList(['a', 'b'])).toEqual(['a', 'b'])
    })

    it('应该去重并去掉空项', () => {
      expect(parseModelList({ data: [{ id: 'a' }, { id: 'a' }, { id: '' }, {}] })).toEqual(['a'])
    })

    it('结构不符时应该返回空数组', () => {
      expect(parseModelList({ foo: 'bar' })).toEqual([])
      expect(parseModelList(null)).toEqual([])
    })
  })

  describe('模型排序', () => {
    it('应该识别出非对话模型', () => {
      expect(isLikelyChatModel('gpt-4o')).toBe(true)
      expect(isLikelyChatModel('text-embedding-3-small')).toBe(false)
      expect(isLikelyChatModel('whisper-1')).toBe(false)
      expect(isLikelyChatModel('dall-e-3')).toBe(false)
    })

    it('应该把对话模型排在前面', () => {
      const sorted = sortModels(['text-embedding-3-small', 'gpt-4o', 'whisper-1', 'gpt-5'])
      expect(sorted.slice(0, 2)).toEqual(['gpt-4o', 'gpt-5'])
      expect(sorted.slice(2)).toEqual(['text-embedding-3-small', 'whisper-1'])
    })
  })

  describe('diagnoseEndpoint', () => {
    const probeOk = async () => '你好'

    it('缺少 URL 时应该在配置步骤就失败', async () => {
      const report = await diagnoseEndpoint({
        apiUrl: '',
        apiKey: 'k',
        model: 'gpt-4o',
        probeChat: probeOk,
      })
      expect(report.ok).toBe(false)
      expect(report.steps).toHaveLength(1)
      expect(report.steps[0]).toMatchObject({
        id: 'config',
        status: 'error',
        messageKey: 'missingUrl',
      })
    })

    it('缺少 Key 时应该在配置步骤就失败', async () => {
      const report = await diagnoseEndpoint({
        apiUrl: 'https://api.openai.com/v1',
        apiKey: '  ',
        model: 'gpt-4o',
        probeChat: probeOk,
      })
      expect(report.ok).toBe(false)
      expect(report.steps[0].messageKey).toBe('missingKey')
    })

    it('缺少 URL 时不应该发起任何请求', async () => {
      let called = false
      await diagnoseEndpoint({
        apiUrl: '',
        apiKey: 'k',
        model: 'gpt-4o',
        probeChat: async () => {
          called = true
          return 'x'
        },
      })
      expect(called).toBe(false)
    })
  })
})
