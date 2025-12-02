/**
 * @vitest-environment happy-dom
 */

import {
  AI_MODEL_PRESETS,
  DEFAULT_AI_MODEL_PRESET,
  resolveAiModel,
  getModelLabel,
  SINGLE_PROMPT_TEMPLATE,
  BATCH_PROMPT_TEMPLATE,
  renderPromptTemplate,
} from '@/models/ai'

describe('AI 模型', () => {
  describe('AI_MODEL_PRESETS', () => {
    it('应该包含预定义的模型预设', () => {
      expect(AI_MODEL_PRESETS).toHaveProperty('gpt-5-mini')
      expect(AI_MODEL_PRESETS).toHaveProperty('gpt-5')
      expect(AI_MODEL_PRESETS).toHaveProperty('gpt-5-nano')
      expect(AI_MODEL_PRESETS).toHaveProperty('gpt-4.1-mini')
      expect(AI_MODEL_PRESETS).toHaveProperty('gpt-4o-mini')
      expect(AI_MODEL_PRESETS).toHaveProperty('custom')
    })

    it('应该有默认模型预设', () => {
      expect(DEFAULT_AI_MODEL_PRESET).toBe('gpt-5-mini')
    })
  })

  describe('resolveAiModel', () => {
    it('应该返回预设模型当预设有效时', () => {
      expect(resolveAiModel('gpt-5', '')).toBe('gpt-5')
      expect(resolveAiModel('gpt-4o-mini', '')).toBe('gpt-4o-mini')
    })

    it('应该返回自定义模型当预设是 custom 时', () => {
      expect(resolveAiModel('custom', 'gpt-4')).toBe('gpt-4')
      expect(resolveAiModel('custom', 'my-custom-model')).toBe('my-custom-model')
    })

    it('应该返回自定义模型当预设无效时', () => {
      expect(resolveAiModel('invalid-preset', 'gpt-4')).toBe('gpt-4')
    })

    it('应该返回默认模型当没有自定义模型时', () => {
      expect(resolveAiModel('custom', '')).toBe(DEFAULT_AI_MODEL_PRESET)
      expect(resolveAiModel('invalid', '')).toBe(DEFAULT_AI_MODEL_PRESET)
    })

    it('应该处理空格', () => {
      expect(resolveAiModel('custom', '  gpt-4  ')).toBe('gpt-4')
    })

    it('应该返回默认模型当预设和自定义都无效时', () => {
      expect(resolveAiModel('', '')).toBe(DEFAULT_AI_MODEL_PRESET)
      expect(resolveAiModel('custom', '   ')).toBe(DEFAULT_AI_MODEL_PRESET)
    })
  })

  describe('getModelLabel', () => {
    it('应该为预设模型返回带描述的标签', () => {
      const label = getModelLabel('gpt-5-mini')
      expect(label).toContain('gpt-5-mini')
      expect(label).toContain('默认推荐')
    })

    it('应该为带描述的模型返回完整标签', () => {
      const label = getModelLabel('gpt-5')
      expect(label).toContain('gpt-5')
      expect(label).toContain('标准模型')
    })

    it('应该为没有描述的模型返回模型名', () => {
      const label = getModelLabel('gpt-4.1-mini')
      expect(label).toBe('gpt-4.1-mini')
    })

    it('应该为自定义模型返回模型名', () => {
      const label = getModelLabel('my-custom-model')
      expect(label).toBe('my-custom-model')
    })
  })

  describe('renderPromptTemplate', () => {
    it('应该替换模板变量', () => {
      const template = 'Hello {{name}}, you are {{age}} years old'
      const replacements = {
        name: 'Alice',
        age: '30',
      }

      const result = renderPromptTemplate(template, replacements)
      expect(result).toBe('Hello Alice, you are 30 years old')
    })

    it('应该处理多个相同的变量', () => {
      const template = '{{name}} is {{name}}, {{name}} is {{name}}'
      const replacements = {
        name: 'Alice',
      }

      const result = renderPromptTemplate(template, replacements)
      expect(result).toBe('Alice is Alice, Alice is Alice')
    })

    it('应该处理缺失的变量', () => {
      const template = 'Hello {{name}}, you are {{age}} years old'
      const replacements = {
        name: 'Alice',
      }

      const result = renderPromptTemplate(template, replacements)
      expect(result).toBe('Hello Alice, you are  years old')
    })

    it('应该处理空替换对象', () => {
      const template = 'Hello {{name}}'
      const replacements = {}

      const result = renderPromptTemplate(template, replacements)
      expect(result).toBe('Hello ')
    })

    it('应该处理空白变量名', () => {
      const template = 'Hello {{  name  }}, how are you?'
      const replacements = {
        name: 'Alice',
      }

      const result = renderPromptTemplate(template, replacements)
      expect(result).toBe('Hello Alice, how are you?')
    })
  })

  describe('SINGLE_PROMPT_TEMPLATE', () => {
    it('应该包含必要的部分', () => {
      expect(SINGLE_PROMPT_TEMPLATE).toContain('Translate')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('{{sourceLanguage}}')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('{{targetLanguage}}')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('{{contextBlock}}')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('{{text}}')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('{{extraPromptBlock}}')
    })

    it('应该包含占位符要求', () => {
      expect(SINGLE_PROMPT_TEMPLATE).toContain('%s')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('%d')
      expect(SINGLE_PROMPT_TEMPLATE).toContain('%1$s')
    })

    it('应该要求只返回翻译文本', () => {
      expect(SINGLE_PROMPT_TEMPLATE).toContain('Return ONLY the translated text')
    })
  })

  describe('BATCH_PROMPT_TEMPLATE', () => {
    it('应该包含必要的部分', () => {
      expect(BATCH_PROMPT_TEMPLATE).toContain('Translate')
      expect(BATCH_PROMPT_TEMPLATE).toContain('{{sourceLanguage}}')
      expect(BATCH_PROMPT_TEMPLATE).toContain('{{targetLanguage}}')
      expect(BATCH_PROMPT_TEMPLATE).toContain('{{extraPromptBlock}}')
      expect(BATCH_PROMPT_TEMPLATE).toContain('{{textsJson}}')
    })

    it('应该包含占位符要求', () => {
      expect(BATCH_PROMPT_TEMPLATE).toContain('%s')
      expect(BATCH_PROMPT_TEMPLATE).toContain('%d')
      expect(BATCH_PROMPT_TEMPLATE).toContain('%1$s')
    })

    it('应该要求 JSON 格式返回', () => {
      expect(BATCH_PROMPT_TEMPLATE).toContain('JSON format')
      expect(BATCH_PROMPT_TEMPLATE).toContain('{"key": "translated_text"}')
    })

    it('应该要求只返回 JSON', () => {
      expect(BATCH_PROMPT_TEMPLATE).toContain('Return ONLY valid JSON')
    })

    it('应该处理数组翻译', () => {
      expect(BATCH_PROMPT_TEMPLATE).toContain('arrays and nested structures')
      expect(BATCH_PROMPT_TEMPLATE).toContain('array structure with same length')
    })
  })

  describe('集成测试', () => {
    it('应该能正确渲染单个翻译提示词', () => {
      const rendered = renderPromptTemplate(SINGLE_PROMPT_TEMPLATE, {
        sourceLanguage: 'English',
        targetLanguage: 'Chinese',
        contextBlock: '[Context: App UI]',
        text: 'Hello World',
        extraPromptBlock: '[Extra: Keep formal tone]',
      })

      expect(rendered).toContain('English')
      expect(rendered).toContain('Chinese')
      expect(rendered).toContain('Hello World')
    })

    it('应该能正确渲染批量翻译提示词', () => {
      const textsJson = JSON.stringify([
        { key: 'greeting', text: 'Hello', context: 'App welcome' },
        { key: 'farewell', text: 'Goodbye', context: 'App exit' },
      ])

      const rendered = renderPromptTemplate(BATCH_PROMPT_TEMPLATE, {
        sourceLanguage: 'English',
        targetLanguage: 'Chinese',
        extraPromptBlock: '[Extra: Keep formal tone]',
        textsJson,
      })

      expect(rendered).toContain('English')
      expect(rendered).toContain('Chinese')
      expect(rendered).toContain('greeting')
      expect(rendered).toContain('farewell')
    })
  })
})
