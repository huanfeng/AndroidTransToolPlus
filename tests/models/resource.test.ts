/**
 * @vitest-environment happy-dom
 */

import { LANGUAGE } from '@/models/language'
import { StringItem, ArrayItem, createResItem, type ResItem } from '@/models/resource'

describe('资源模型', () => {
  describe('StringItem', () => {
    it('应该创建字符串资源项', () => {
      const item = new StringItem('greeting', true)

      expect(item.type).toBe('string')
      expect(item.name).toBe('greeting')
      expect(item.translatable).toBe(true)
      expect(item.valueMap).toBeInstanceOf(Map)
    })

    describe('getValue', () => {
      it('应该获取字符串值', () => {
        const item = new StringItem('greeting', true)
        item.setValue(LANGUAGE.DEF, 'Hello')
        item.setValue(LANGUAGE.CN, '你好')

        expect(item.getValue(LANGUAGE.DEF)).toBe('Hello')
        expect(item.getValue(LANGUAGE.CN)).toBe('你好')
      })

      it('应该在语言不存在时返回 undefined', () => {
        const item = new StringItem('greeting', true)
        expect(item.getValue(LANGUAGE.CN)).toBeUndefined()
      })
    })

    describe('setValue', () => {
      it('应该设置字符串值', () => {
        const item = new StringItem('greeting', true)
        item.setValue(LANGUAGE.CN, '你好')

        expect(item.getValue(LANGUAGE.CN)).toBe('你好')
      })

      it('应该覆盖现有值', () => {
        const item = new StringItem('greeting', true)
        item.setValue(LANGUAGE.CN, '你好')
        item.setValue(LANGUAGE.CN, '您好')

        expect(item.getValue(LANGUAGE.CN)).toBe('您好')
      })
    })

    describe('hasValue', () => {
      it('应该在有值且非空时返回 true', () => {
        const item = new StringItem('greeting', true)
        item.setValue(LANGUAGE.CN, '你好')
        expect(item.hasValue(LANGUAGE.CN)).toBe(true)
      })

      it('应该在值为空字符串时返回 false', () => {
        const item = new StringItem('greeting', true)
        item.setValue(LANGUAGE.CN, '')
        expect(item.hasValue(LANGUAGE.CN)).toBe(false)
      })

      it('应该在语言不存在时返回 false', () => {
        const item = new StringItem('greeting', true)
        expect(item.hasValue(LANGUAGE.CN)).toBe(false)
      })
    })

    describe('clone', () => {
      it('应该克隆资源项', () => {
        const original = new StringItem('greeting', true)
        original.setValue(LANGUAGE.DEF, 'Hello')
        original.setValue(LANGUAGE.CN, '你好')

        const cloned = original.clone()

        expect(cloned.name).toBe(original.name)
        expect(cloned.type).toBe(original.type)
        expect(cloned.translatable).toBe(original.translatable)
        expect(cloned.getValue(LANGUAGE.DEF)).toBe('Hello')
        expect(cloned.getValue(LANGUAGE.CN)).toBe('你好')

        // 修改克隆不应影响原件
        cloned.setValue(LANGUAGE.CN, '您好')
        expect(original.getValue(LANGUAGE.CN)).toBe('你好')
        expect(cloned.getValue(LANGUAGE.CN)).toBe('您好')
      })
    })
  })

  describe('ArrayItem', () => {
    it('应该创建数组资源项', () => {
      const item = new ArrayItem('weekdays', true)

      expect(item.type).toBe('string-array')
      expect(item.name).toBe('weekdays')
      expect(item.translatable).toBe(true)
      expect(item.valueMap).toBeInstanceOf(Map)
    })

    describe('getValue', () => {
      it('应该获取数组值', () => {
        const item = new ArrayItem('weekdays', true)
        const days = ['Monday', 'Tuesday', 'Wednesday']
        item.setValue(LANGUAGE.DEF, days)

        expect(item.getValue(LANGUAGE.DEF)).toEqual(days)
      })

      it('应该在语言不存在时返回 undefined', () => {
        const item = new ArrayItem('weekdays', true)
        expect(item.getValue(LANGUAGE.CN)).toBeUndefined()
      })
    })

    describe('setValue', () => {
      it('应该设置数组值', () => {
        const item = new ArrayItem('weekdays', true)
        const days = ['Monday', 'Tuesday', 'Wednesday']
        item.setValue(LANGUAGE.DEF, days)

        expect(item.getValue(LANGUAGE.DEF)).toEqual(days)
      })

      it('应该覆盖现有值', () => {
        const item = new ArrayItem('weekdays', true)
        item.setValue(LANGUAGE.DEF, ['Monday', 'Tuesday'])
        item.setValue(LANGUAGE.DEF, ['Monday', 'Tuesday', 'Wednesday'])

        expect(item.getValue(LANGUAGE.DEF)).toEqual(['Monday', 'Tuesday', 'Wednesday'])
      })
    })

    describe('hasValue', () => {
      it('应该在有非空数组时返回 true', () => {
        const item = new ArrayItem('weekdays', true)
        item.setValue(LANGUAGE.DEF, ['Monday', 'Tuesday'])
        expect(item.hasValue(LANGUAGE.DEF)).toBe(true)
      })

      it('应该在数组为空时返回 false', () => {
        const item = new ArrayItem('weekdays', true)
        item.setValue(LANGUAGE.DEF, [])
        expect(item.hasValue(LANGUAGE.DEF)).toBe(false)
      })

      it('应该在语言不存在时返回 false', () => {
        const item = new ArrayItem('weekdays', true)
        expect(item.hasValue(LANGUAGE.CN)).toBe(false)
      })
    })

    describe('clone', () => {
      it('应该克隆数组资源项', () => {
        const original = new ArrayItem('weekdays', true)
        const days = ['Monday', 'Tuesday', 'Wednesday']
        original.setValue(LANGUAGE.DEF, days)
        original.setValue(LANGUAGE.CN, ['周一', '周二', '周三'])

        const cloned = original.clone()

        expect(cloned.name).toBe(original.name)
        expect(cloned.type).toBe(original.type)
        expect(cloned.translatable).toBe(original.translatable)
        expect(cloned.getValue(LANGUAGE.DEF)).toEqual(days)
        expect(cloned.getValue(LANGUAGE.CN)).toEqual(['周一', '周二', '周三'])

        // 修改克隆不应影响原件
        const newDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
        cloned.setValue(LANGUAGE.DEF, newDays)
        expect(original.getValue(LANGUAGE.DEF)).toEqual(days)
        expect(cloned.getValue(LANGUAGE.DEF)).toEqual(newDays)
      })
    })
  })

  describe('createResItem', () => {
    it('应该创建字符串资源项', () => {
      const item = createResItem('string', 'greeting', true)
      expect(item).toBeInstanceOf(StringItem)
      expect(item.type).toBe('string')
    })

    it('应该创建数组资源项', () => {
      const item = createResItem('string-array', 'weekdays', true)
      expect(item).toBeInstanceOf(ArrayItem)
      expect(item.type).toBe('string-array')
    })

    it('应该使用默认值 translatable=true', () => {
      const stringItem = createResItem('string', 'greeting')
      expect(stringItem.translatable).toBe(true)

      const arrayItem = createResItem('string-array', 'weekdays')
      expect(arrayItem.translatable).toBe(true)
    })

    it('应该支持设置不可翻译', () => {
      const stringItem = createResItem('string', 'app_name', false)
      expect(stringItem.translatable).toBe(false)

      const arrayItem = createResItem('string-array', 'weekdays', false)
      expect(arrayItem.translatable).toBe(false)
    })
  })

  describe('ResItem 接口', () => {
    it('StringItem 应该实现 ResItem 接口', () => {
      const item: ResItem = new StringItem('greeting', true)
      expect(typeof item.getValue).toBe('function')
      expect(typeof item.setValue).toBe('function')
      expect(typeof item.hasValue).toBe('function')
      expect(typeof item.clone).toBe('function')
    })

    it('ArrayItem 应该实现 ResItem 接口', () => {
      const item: ResItem = new ArrayItem('weekdays', true)
      expect(typeof item.getValue).toBe('function')
      expect(typeof item.setValue).toBe('function')
      expect(typeof item.hasValue).toBe('function')
      expect(typeof item.clone).toBe('function')
    })
  })
})
