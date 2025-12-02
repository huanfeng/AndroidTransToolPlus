/**
 * @vitest-environment happy-dom
 */

import {
  Language,
  getAllLanguages,
  getLanguageByAndroidCode,
  getLanguageByValuesDirName,
  getLanguageInfo,
  getLanguageName,
  LanguageManager,
  type CustomLanguage,
} from '@/models/language'

describe('语言模型', () => {
  describe('Language 枚举', () => {
    it('应该包含所有预定义语言', () => {
      const languages = Object.values(Language)
      expect(languages).toContain(Language.DEF)
      expect(languages).toContain(Language.CN)
      expect(languages).toContain(Language.CN_HK)
      expect(languages).toContain(Language.CN_TW)
      expect(languages).toContain(Language.AR)
      expect(languages).toContain(Language.DE)
      expect(languages).toContain(Language.FR)
      expect(languages).toContain(Language.HI)
      expect(languages).toContain(Language.IT)
      expect(languages).toContain(Language.IW)
      expect(languages).toContain(Language.JA)
      expect(languages).toContain(Language.KO)
      expect(languages).toContain(Language.RU)
      expect(languages).toContain(Language.UK)
    })
  })

  describe('getAllLanguages', () => {
    it('应该返回所有语言列表', () => {
      const all = getAllLanguages()
      expect(all.length).toBeGreaterThan(0)
      expect(all).toContain(Language.DEF)
    })
  })

  describe('getLanguageByAndroidCode', () => {
    it('应该根据 Android 代码返回对应语言', () => {
      expect(getLanguageByAndroidCode('zh-rCN')).toBe(Language.CN)
      expect(getLanguageByAndroidCode('de')).toBe(Language.DE)
      expect(getLanguageByAndroidCode('ja')).toBe(Language.JA)
      expect(getLanguageByAndroidCode('ko')).toBe(Language.KO)
    })

    it('应该处理 values- 前缀', () => {
      expect(getLanguageByAndroidCode('values-zh-rCN')).toBe(Language.CN)
      expect(getLanguageByAndroidCode('values-de')).toBe(Language.DE)
    })

    it('应该处理空值和 values', () => {
      expect(getLanguageByAndroidCode('')).toBe(Language.DEF)
      expect(getLanguageByAndroidCode('values')).toBe(Language.DEF)
    })

    it('应该返回 null 当找不到对应语言时', () => {
      expect(getLanguageByAndroidCode('invalid-code')).toBeNull()
      expect(getLanguageByAndroidCode('xx')).toBeNull()
    })
  })

  describe('getLanguageByValuesDirName', () => {
    it('应该根据 values 目录名返回对应语言', () => {
      expect(getLanguageByValuesDirName('values-zh-rCN')).toBe(Language.CN)
      expect(getLanguageByValuesDirName('values-de')).toBe(Language.DE)
      expect(getLanguageByValuesDirName('values-ja')).toBe(Language.JA)
      expect(getLanguageByValuesDirName('values-iw')).toBe(Language.IW)
    })

    it('应该处理默认 values 目录', () => {
      expect(getLanguageByValuesDirName('values')).toBe(Language.DEF)
    })

    it('应该返回 null 当找不到对应语言时', () => {
      expect(getLanguageByValuesDirName('values-invalid')).toBeNull()
      expect(getLanguageByValuesDirName('invalid')).toBeNull()
    })
  })

  describe('getLanguageInfo', () => {
    it('应该返回语言信息', () => {
      const info = getLanguageInfo(Language.CN)
      expect(info.code).toBe(Language.CN)
      expect(info.androidCode).toBe('zh-rCN')
      expect(info.nameCn).toBe('简体中文')
      expect(info.nameEn).toBe('Simplified Chinese')
      expect(info.valuesDirName).toBe('values-zh-rCN')
    })
  })

  describe('getLanguageName', () => {
    it('应该返回中文名称', () => {
      expect(getLanguageName(Language.CN, 'cn')).toBe('简体中文')
      expect(getLanguageName(Language.DE, 'cn')).toBe('德语')
    })

    it('应该返回英文名称', () => {
      expect(getLanguageName(Language.CN, 'en')).toBe('Simplified Chinese')
      expect(getLanguageName(Language.DE, 'en')).toBe('German')
    })

    it('应该默认为中文', () => {
      expect(getLanguageName(Language.CN)).toBe('简体中文')
      expect(getLanguageName(Language.DE)).toBe('德语')
    })
  })

  describe('LanguageManager', () => {
    let manager: LanguageManager

    beforeEach(() => {
      // 重置单例
      manager = LanguageManager.getInstance()
      manager.setCustomLanguages([])
    })

    describe('单例模式', () => {
      it('应该返回同一个实例', () => {
        const instance1 = LanguageManager.getInstance()
        const instance2 = LanguageManager.getInstance()
        expect(instance1).toBe(instance2)
      })
    })

    describe('setCustomLanguages', () => {
      it('应该设置自定义语言列表', () => {
        const customLangs: CustomLanguage[] = [
          {
            androidCode: 'es',
            nameCn: '西班牙语',
            nameEn: 'Spanish',
          },
        ]
        manager.setCustomLanguages(customLangs)
        expect(manager.getCustomLanguages()).toEqual(customLangs)
      })
    })

    describe('addCustomLanguage', () => {
      it('应该成功添加自定义语言', () => {
        const customLang: CustomLanguage = {
          androidCode: 'es',
          nameCn: '西班牙语',
          nameEn: 'Spanish',
        }
        manager.addCustomLanguage(customLang)
        expect(manager.getCustomLanguages()).toHaveLength(1)
        expect(manager.getCustomLanguages()[0]).toEqual(customLang)
      })

      it('应该自动生成 values 目录名', () => {
        const customLang: CustomLanguage = {
          androidCode: 'es',
          nameCn: '西班牙语',
          nameEn: 'Spanish',
        }
        manager.addCustomLanguage(customLang)
        const customLangs = manager.getCustomLanguages()
        expect(customLangs[0].valuesDirName).toBe('values-es')
      })

      it('应该使用提供的 values 目录名', () => {
        const customLang: CustomLanguage = {
          androidCode: 'pt',
          nameCn: '葡萄牙语',
          nameEn: 'Portuguese',
          valuesDirName: 'values-pt-rBR',
        }
        manager.addCustomLanguage(customLang)
        const customLangs = manager.getCustomLanguages()
        expect(customLangs[0].valuesDirName).toBe('values-pt-rBR')
      })

      it('应该在添加重复语言时抛出错误', () => {
        const customLang: CustomLanguage = {
          androidCode: 'es',
          nameCn: '西班牙语',
          nameEn: 'Spanish',
        }
        manager.addCustomLanguage(customLang)
        expect(() => {
          manager.addCustomLanguage(customLang)
        }).toThrow('already exists')
      })

      it('应该在 Android 代码无效时抛出错误', () => {
        expect(() => {
          manager.addCustomLanguage({
            androidCode: 'invalid!',
            nameCn: '无效语言',
            nameEn: 'Invalid',
          })
        }).toThrow('Invalid Android language code')
      })

      it('应该在语言已存在于默认语言中时抛出错误', () => {
        expect(() => {
          manager.addCustomLanguage({
            androidCode: 'de',
            nameCn: '德语',
            nameEn: 'German',
          })
        }).toThrow('already exists in default languages')
      })
    })

    describe('removeCustomLanguage', () => {
      it('应该成功删除自定义语言', () => {
        manager.addCustomLanguage({
          androidCode: 'es',
          nameCn: '西班牙语',
          nameEn: 'Spanish',
        })
        expect(manager.getCustomLanguages()).toHaveLength(1)

        const removed = manager.removeCustomLanguage('es')
        expect(removed).toBe(true)
        expect(manager.getCustomLanguages()).toHaveLength(0)
      })

      it('应该在语言不存在时返回 false', () => {
        const removed = manager.removeCustomLanguage('nonexistent')
        expect(removed).toBe(false)
      })
    })

    describe('getAllLanguages', () => {
      it('应该返回所有语言包括默认和自定义', () => {
        manager.addCustomLanguage({
          androidCode: 'es',
          nameCn: '西班牙语',
          nameEn: 'Spanish',
        })
        manager.addCustomLanguage({
          androidCode: 'pt',
          nameCn: '葡萄牙语',
          nameEn: 'Portuguese',
        })

        const allLangs = manager.getAllLanguages()
        expect(allLangs.length).toBeGreaterThan(14) // 默认语言 + 自定义语言

        // 检查默认语言
        const defLang = allLangs.find(l => l.code === Language.CN)
        expect(defLang).toBeTruthy()
        expect(defLang?.isDefault).toBe(true)

        // 检查自定义语言
        const customLang = allLangs.find(l => l.androidCode === 'es')
        expect(customLang).toBeTruthy()
        expect(customLang?.isDefault).toBe(false)
      })

      it('应该按代码排序', () => {
        manager.setCustomLanguages([
          {
            androidCode: 'es',
            nameCn: '西班牙语',
            nameEn: 'Spanish',
          },
          {
            androidCode: 'pt',
            nameCn: '葡萄牙语',
            nameEn: 'Portuguese',
          },
        ])

        const allLangs = manager.getAllLanguages()
        const codes = allLangs.map(l => l.code)
        const sortedCodes = [...codes].sort((a, b) => a.localeCompare(b))
        expect(codes).toEqual(sortedCodes)
      })
    })

    describe('getLanguageInfoByCode', () => {
      it('应该根据代码找到语言信息', () => {
        const langInfo = manager.getLanguageInfoByCode(Language.CN)
        expect(langInfo).toBeTruthy()
        expect(langInfo?.code).toBe(Language.CN)
      })

      it('应该返回 null 当找不到时', () => {
        const langInfo = manager.getLanguageInfoByCode('nonexistent')
        expect(langInfo).toBeNull()
      })
    })

    describe('getLanguageInfoByAndroidCode', () => {
      it('应该根据 Android 代码找到语言信息', () => {
        const langInfo = manager.getLanguageInfoByAndroidCode('zh-rCN')
        expect(langInfo).toBeTruthy()
        expect(langInfo?.androidCode).toBe('zh-rCN')
      })

      it('应该返回 null 当找不到时', () => {
        const langInfo = manager.getLanguageInfoByAndroidCode('xx')
        expect(langInfo).toBeNull()
      })
    })

    describe('getLanguageInfoByValuesDir', () => {
      it('应该根据 values 目录名找到语言信息', () => {
        const langInfo = manager.getLanguageInfoByValuesDir('values-zh-rCN')
        expect(langInfo).toBeTruthy()
        expect(langInfo?.valuesDirName).toBe('values-zh-rCN')
      })

      it('应该返回 null 当找不到时', () => {
        const langInfo = manager.getLanguageInfoByValuesDir('values-invalid')
        expect(langInfo).toBeNull()
      })
    })

    describe('toLanguageEnum', () => {
      it('应该将代码转换为 Language 枚举', () => {
        expect(manager.toLanguageEnum('cn')).toBe(Language.CN)
        expect(manager.toLanguageEnum('de')).toBe(Language.DE)
        expect(manager.toLanguageEnum('ja')).toBe(Language.JA)
      })

      it('应该返回 null 当代码无效时', () => {
        expect(manager.toLanguageEnum('invalid')).toBeNull()
        expect(manager.toLanguageEnum('nonexistent')).toBeNull()
      })
    })

    describe('isValidAndroidCode', () => {
      it('应该验证有效的 Android 代码', () => {
        const validCodes = ['es', 'pt', 'nl', 'sv', 'pl']
        for (const code of validCodes) {
          // 通过尝试添加来测试
          expect(() => {
            const manager2 = LanguageManager.getInstance()
            manager2.setCustomLanguages([])
            manager2.addCustomLanguage({
              androidCode: code,
              nameCn: 'Test',
              nameEn: 'Test',
            })
          }).not.toThrow()
        }
      })

      it('应该拒绝无效的 Android 代码', () => {
        const invalidCodes = ['!@#', '123', 'a']
        for (const code of invalidCodes) {
          expect(() => {
            const manager2 = LanguageManager.getInstance()
            manager2.setCustomLanguages([])
            manager2.addCustomLanguage({
              androidCode: code,
              nameCn: 'Test',
              nameEn: 'Test',
            })
          }).toThrow('Invalid Android language code')
        }
      })
    })
  })
})
