# 自定义语言使用示例

## 示例 1：添加泰语

```typescript
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

// 添加泰语支持
configStore.addCustomLanguage({
  androidCode: 'th',
  nameCn: '泰语',
  nameEn: 'Thai'
})

console.log('已添加泰语支持')
```

## 示例 2：批量添加东南亚语言

```typescript
const东南亚语言 = [
  { androidCode: 'th', nameCn: '泰语', nameEn: 'Thai' },
  { androidCode: 'vi', nameCn: '越南语', nameEn: 'Vietnamese' },
  { androidCode: 'id', nameCn: '印尼语', nameEn: 'Indonesian' },
  { androidCode: 'ms', nameCn: '马来语', nameEn: 'Malay' },
  { androidCode: 'tl', nameCn: '菲律宾语', nameEn: 'Filipino' },
  { androidCode: 'km', nameCn: '高棉语', nameEn: 'Khmer' },
  { androidCode: 'lo', nameCn: '老挝语', nameEn: 'Lao' },
  { androidCode: 'my', nameCn: '缅甸语', nameEn: 'Burmese' },
]

东南亚语言.forEach(lang => {
  try {
    configStore.addCustomLanguage(lang)
    console.log(`✓ 成功添加: ${lang.nameCn} (${lang.androidCode})`)
  } catch (error) {
    console.log(`✗ 添加失败: ${lang.nameCn} - ${error.message}`)
  }
})
```

## 示例 3：查看所有可用语言

```typescript
import { LanguageManager } from '@/models/language'

const langManager = LanguageManager.getInstance()

// 获取所有语言
const所有语言 = langManager.getAllLanguages()

console.log('默认语言:')
所有语言.filter(l => l.isDefault).forEach(l => {
  console.log(`  ${l.nameCn} (${l.androidCode})`)
})

console.log('\n自定义语言:')
所有语言.filter(l => !l.isDefault).forEach(l => {
  console.log(`  ${l.nameCn} (${l.androidCode})`)
})
```

## 示例 4：根据条件查找语言

```typescript
// 查找所有中文变体
const中文变体 = langManager.getAllLanguages().filter(
  l => l.androidCode.startsWith('zh')
)
console.log('中文变体:', 中文变体.map(l => l.nameCn))

// 查找所有欧洲语言
const欧洲语言 = langManager.getAllLanguages().filter(
  l => ['de', 'fr', 'es', 'it', 'pt', 'ru', 'nl', 'pl'].includes(l.androidCode)
)
console.log('欧洲语言:', 欧洲语言.map(l => l.nameCn))
```

## 示例 5：删除自定义语言

```typescript
// 删除泰语
const success = configStore.removeCustomLanguage('th')
if (success) {
  console.log('已删除泰语')
} else {
  console.log('删除失败：泰语不存在')
}
```

## 示例 6：完整的语言管理流程

```typescript
import { useConfigStore } from '@/stores/config'

class LanguageManager {
  static async setupCustomLanguages() {
    const configStore = useConfigStore()

    // 检查是否已加载配置
    if (!configStore.loaded) {
      await configStore.load()
    }

    // 添加需要的语言
    const需要语言 = [
      { androidCode: 'th', nameCn: '泰语', nameEn: 'Thai' },
      { androidCode: 'vi', nameCn: '越南语', nameEn: 'Vietnamese' },
      { androidCode: 'es', nameCn: '西班牙语', nameEn: 'Spanish' },
    ]

    for (const lang of 需要语言) {
      try {
        configStore.addCustomLanguage(lang)
        console.log(`✓ ${lang.nameCn} 已添加`)
      } catch (error) {
        // 语言可能已存在，忽略错误
        console.log(`- ${lang.nameCn} 已存在`)
      }
    }

    // 获取所有语言
    const所有语言 = configStore.getAllAvailableLanguages()
    console.log(`当前共有 ${所有语言.length} 种语言`)

    return 所有语言
  }
}

// 使用示例
LanguageManager.setupCustomLanguages()
```

## 验证示例

### 有效的语言代码

```typescript
// 简单语言代码
'th', 'vi', 'id', 'ms', 'tl', 'ar', 'de', 'fr', 'es'

// 带地区的语言代码
'zh-rCN', 'zh-rHK', 'zh-rTW', 'pt-rBR', 'es-rMX'
```

### 无效的语言代码

```typescript
// ❌ 错误：包含数字
'th1', 'vi2'

// ❌ 错误：特殊字符
'th-TH', 'vi_VN'

// ❌ 错误：过长
'thai-language'

// ❌ 错误：与默认语言重复
'cn', 'ja', 'ko' // 这些已存在
```

## 最佳实践

1. **使用标准 Android 语言代码**：参考 [Android 语言代码列表](https://developer.android.com/reference/java/util/Locale)

2. **中文名称要准确**：确保显示名称是用户友好的

3. **英文名称使用标准名称**：有助于 AI 翻译模型识别

4. **谨慎删除语言**：删除前确认项目中没有使用该语言的资源

5. **定期备份配置**：自定义语言会保存在应用配置中

---

**示例版本**: v1.0.0
**更新时间**: 2025-11-19
