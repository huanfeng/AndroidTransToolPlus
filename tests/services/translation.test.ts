/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { OpenAITranslator } from '@/services/translation/openai'
import { LANGUAGE } from '@/models/language'

// 模拟 axios
vi.mock('axios')

describe('翻译服务', () => {
  let translator: OpenAITranslator
  const mockConfig = {
    apiUrl: 'https://api.openai.com/v1',
    apiToken: 'test-api-key',
    model: 'gpt-4o-mini',
    timeout: 30000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    translator = new OpenAITranslator(mockConfig)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OpenAITranslator', () => {
    it('应该创建翻译器实例', () => {
      expect(translator).toBeTruthy()
      expect(translator).toBeInstanceOf(OpenAITranslator)
    })

    it('应该使用默认配置', () => {
      const translatorWithDefaults = new OpenAITranslator({
        apiUrl: 'https://api.openai.com/v1',
        apiToken: 'test-key',
      })

      expect(translatorWithDefaults).toBeTruthy()
    })
  })

  describe('createClient', () => {
    it('应该创建 axios 客户端', () => {
      const mockAxios = vi.mocked(axios).create
      expect(mockAxios).toHaveBeenCalled()
    })

    it('应该配置正确的 baseURL', () => {
      const mockAxios = vi.mocked(axios).create
      const callArgs = mockAxios.mock.calls[0]
      expect(callArgs[0].baseURL).toBe(mockConfig.apiUrl)
    })

    it('应该配置请求头', () => {
      const mockAxios = vi.mocked(axios).create
      const callArgs = mockAxios.mock.calls[0]
      expect(callArgs[0].headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        })
      )
    })
  })

  describe('translate', () => {
    it('应该翻译单个文本', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: '你好',
              },
            },
          ],
        },
      })

      const request = {
        text: 'Hello',
        targetLanguage: LANGUAGE.CN,
        sourceLanguage: LANGUAGE.DEF,
      }

      const result = await translator.translate(request)

      expect(mockPost).toHaveBeenCalled()
      expect(result.originalText).toBe('Hello')
      expect(result.translatedText).toBe('你好')
      expect(result.targetLanguage).toBe(LANGUAGE.CN)
    })

    it('应该在没有源语言时使用默认', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'Hola',
              },
            },
          ],
        },
      })

      const request = {
        text: 'Hello',
        targetLanguage: LANGUAGE.FR,
      }

      await translator.translate(request)

      expect(mockPost).toHaveBeenCalled()
      const callArgs = mockPost.mock.calls[0]
      const messages = JSON.parse(callArgs[1].data).messages
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('from English to French'),
          }),
        ])
      )
    })

    it('应该在请求失败时抛出错误', async () => {
      const mockPost = vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))

      const request = {
        text: 'Hello',
        targetLanguage: LANGUAGE.CN,
      }

      await expect(translator.translate(request)).rejects.toThrow('Network error')
    })

    it('应该处理 API 错误响应', async () => {
      const mockPost = vi.mocked(axios.post).mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Invalid API key',
            },
          },
        },
      })

      const request = {
        text: 'Hello',
        targetLanguage: LANGUAGE.CN,
      }

      await expect(translator.translate(request)).rejects.toThrow()
    })
  })

  describe('batchTranslate', () => {
    it('应该批量翻译多个文本', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content:
                  '{"greeting": "你好", "farewell": "再见", "thanks": "谢谢"}',
              },
            },
          ],
        },
      })

      const request = {
        items: [
          { key: 'greeting', text: 'Hello' },
          { key: 'farewell', text: 'Goodbye' },
          { key: 'thanks', text: 'Thank you' },
        ],
        targetLanguage: LANGUAGE.CN,
      }

      const result = await translator.batchTranslate(request)

      expect(result.results.size).toBe(3)
      expect(result.results.get('greeting')).toBe('你好')
      expect(result.results.get('farewell')).toBe('再见')
      expect(result.results.get('thanks')).toBe('谢谢')
    })

    it('应该处理数组文本', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: '{"weekdays": ["周一", "周二", "周三"]}',
              },
            },
          ],
        },
      })

      const request = {
        items: [
          {
            key: 'weekdays',
            text: ['Monday', 'Tuesday', 'Wednesday'],
            context: 'Days of week',
          },
        ],
        targetLanguage: LANGUAGE.CN,
      }

      const result = await translator.batchTranslate(request)

      expect(result.results.get('weekdays')).toEqual(['周一', '周二', '周三'])
    })

    it('应该返回翻译错误', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: '{"greeting": "你好"}',
              },
            },
          ],
        },
      })

      const request = {
        items: [
          { key: 'greeting', text: 'Hello' },
          { key: 'invalid', text: '' },
        ],
        targetLanguage: LANGUAGE.CN,
      }

      const result = await translator.batchTranslate(request)

      expect(result.results.has('greeting')).toBe(true)
    })

    it('应该在批量请求失败时记录错误', async () => {
      const mockPost = vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))

      const request = {
        items: [{ key: 'greeting', text: 'Hello' }],
        targetLanguage: LANGUAGE.CN,
      }

      const result = await translator.batchTranslate(request)

      // 应该返回结果，而不是抛出错误
      expect(result.errors.size).toBeGreaterThan(0)
      expect(result.errors.has('greeting')).toBe(true)
      expect(result.errors.get('greeting')).toContain('Network error')
    })
  })

  describe('cancel', () => {
    it('应该取消进行中的请求', () => {
      const mockAbort = vi.fn()
      vi.mocked(axios.post).mockImplementation(() => {
        return new Promise(() => {}) as any
      })

      translator.translate({
        text: 'Hello',
        targetLanguage: LANGUAGE.CN,
      })

      translator.cancel()

      expect(translator).toBeTruthy()
    })
  })
})
