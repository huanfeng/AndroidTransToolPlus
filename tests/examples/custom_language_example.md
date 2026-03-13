# 自定义语言使用示例

## 说明

现在很多常见 Android 语言已经内置，例如 `th`、`vi`、`id`、`ms`、`nl`、`pl`、`tr`、`sv` 等。

只有在以下场景才建议使用自定义语言：

- 目标语言尚未内置
- 需要补充特定地区变体
- 项目要求使用少见语种

下面的示例统一使用当前尚未内置的语言代码。

## 示例 1：添加一个未内置语言

```ts
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

configStore.addCustomLanguage({
  androidCode: 'km',
  nameCn: '高棉语',
  nameEn: 'Khmer',
})

console.log('已添加高棉语')
```

## 示例 2：批量添加少见语言

```ts
const extraLanguages = [
  { androidCode: 'km', nameCn: '高棉语', nameEn: 'Khmer' },
  { androidCode: 'lo', nameCn: '老挝语', nameEn: 'Lao' },
  { androidCode: 'my', nameCn: '缅甸语', nameEn: 'Burmese' },
  { androidCode: 'sw', nameCn: '斯瓦希里语', nameEn: 'Swahili' },
  { androidCode: 'am', nameCn: '阿姆哈拉语', nameEn: 'Amharic' },
]

extraLanguages.forEach(lang => {
  try {
    configStore.addCustomLanguage(lang)
    console.log(`✓ 成功添加: ${lang.nameCn} (${lang.androidCode})`)
  } catch (error) {
    console.log(`✗ 添加失败: ${lang.nameCn} - ${error.message}`)
  }
})
```

## 示例 3：查看所有语言

```ts
import { LanguageManager } from '@/models/language'

const langManager = LanguageManager.getInstance()
const allLanguages = langManager.getAllLanguages()

console.log('内置语言:')
allLanguages
  .filter(lang => lang.isDefault)
  .forEach(lang => console.log(`  ${lang.nameCn} (${lang.androidCode || 'values'})`))

console.log('\n自定义语言:')
allLanguages
  .filter(lang => !lang.isDefault)
  .forEach(lang => console.log(`  ${lang.nameCn} (${lang.androidCode})`))
```

## 示例 4：恢复默认启用语言

```ts
import { getDefaultEnabledBuiltinLanguages } from '@/models/language'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

configStore.update('enabledLanguages', getDefaultEnabledBuiltinLanguages())

console.log('已恢复默认启用语言列表')
```

## 示例 5：删除自定义语言

```ts
const success = configStore.removeCustomLanguage('km')

if (success) {
  console.log('已删除高棉语')
} else {
  console.log('删除失败：高棉语不存在')
}
```

## 示例 6：添加地区变体

```ts
configStore.addCustomLanguage({
  androidCode: 'pt-rBR',
  nameCn: '葡萄牙语（巴西）',
  nameEn: 'Portuguese (Brazil)',
})
```

## 有效代码示例

```ts
'km'
'lo'
'my'
'sw'
'am'
'pt-rBR'
'es-rMX'
```

## 不建议再作为自定义语言添加的代码

这些语言现在已经有内置支持，应直接在设置页启用：

```ts
'th'
'vi'
'id'
'ms'
'nl'
'pl'
'tr'
'sv'
```

## 最佳实践

1. 先检查设置页“可启用的语言”里是否已经有目标语言。
2. 只有内置未覆盖时，再使用自定义语言。
3. 英文名称尽量使用标准语言名，便于 AI 模型识别。
4. 删除自定义语言前，确认项目中没有依赖该语言目录。
5. 如果只是想恢复旧默认集合，优先使用设置页里的“添加默认”。

---

更新时间：2026-03-13
