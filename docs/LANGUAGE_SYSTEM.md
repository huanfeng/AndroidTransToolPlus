# 语言系统优化说明

## 概述

本次更新对 Android 翻译工具的语言系统进行了全面优化，解决了代码不统一和语言扩展性问题。新增了用户自定义语言功能，支持更灵活的 Android 多语言项目。

## 主要变更

### 0. 扩充内置语言库

- 预置语言已扩展，覆盖更多 Android 常见语言，如 `th`、`vi`、`id`、`ms`、`nl`、`pl`、`tr`、`sv`、`da`、`fi`、`cs`、`hu`、`ro`、`el`、`fa`、`ur`、`bn`、`ta` 等。
- 这些语言会直接出现在“可用语言”列表里，优先减少用户手动维护自定义语言的场景。
- 默认启用语言列表保持现状不变，新增预置语言不会自动进入当前项目的默认翻译目标集合。

### 1. 统一语言代码格式

**问题**：之前内部使用短代码（如 `cn`, `de`），而 Android 使用完整代码（如 `zh-rCN`, `de`），导致不一致。

**解决方案**：
- 保留原有的 `Language` 枚举以保证向后兼容
- 内部使用 `LanguageManager` 统一管理所有语言
- Android 代码作为主要标识符

### 2. 新增 `LanguageManager` 类

负责统一管理所有语言（默认 + 自定义）：

```typescript
class LanguageManager {
  // 获取所有语言（默认 + 自定义）
  getAllLanguages(): FullLanguageInfo[]

  // 添加自定义语言
  addCustomLanguage(lang: CustomLanguage): void

  // 删除自定义语言
  removeCustomLanguage(androidCode: string): boolean

  // 根据代码查找语言
  getLanguageInfoByCode(code: string): FullLanguageInfo | null
  getLanguageInfoByAndroidCode(androidCode: string): FullLanguageInfo | null
  getLanguageInfoByValuesDir(dirName: string): FullLanguageInfo | null
}
```

### 3. 自定义语言配置

用户可添加任意 Android 支持的语言：

```typescript
interface CustomLanguage {
  androidCode: string // Android 语言代码（必填）
  nameCn: string // 中文显示名称（必填）
  nameEn: string // 英文名称，用于AI翻译（必填）
  valuesDirName?: string // values 目录名（可选，自动生成）
}
```

**支持的 Android 语言代码格式**：
- 简单语言代码：`ar`, `de`, `fr`, `es` 等
- 带地区的代码：`zh-rCN`, `zh-rHK`, `zh-rTW` 等

### 4. 配置管理增强

在 `AppConfig` 中新增 `customLanguages` 字段：

```typescript
interface AppConfig {
  // ... 其他配置
  customLanguages: CustomLanguage[] // 自定义语言列表
}
```

配置会自动持久化存储，重启后保持自定义语言设置。

### 5. 向后兼容

- 保留所有现有 `Language` 枚举值
- 现有项目的语言配置不会丢失
- 新功能不影响原有翻译功能

## 使用方法

### 1. 查看所有可用语言

```typescript
import { LanguageManager } from '@/models/language'

const langManager = LanguageManager.getInstance()
const allLanguages = langManager.getAllLanguages()

allLanguages.forEach(lang => {
  console.log(`代码: ${lang.code}`)
  console.log(`Android代码: ${lang.androidCode}`)
  console.log(`中文名: ${lang.nameCn}`)
  console.log(`英文名: ${lang.nameEn}`)
  console.log(`Values目录: ${lang.valuesDirName}`)
  console.log(`是否为默认: ${lang.isDefault}`)
  console.log('---')
})
```

### 2. 添加自定义语言

```typescript
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

// 添加泰语
configStore.addCustomLanguage({
  androidCode: 'th',
  nameCn: '泰语',
  nameEn: 'Thai'
})

// 添加印尼语
configStore.addCustomLanguage({
  androidCode: 'id',
  nameCn: '印尼语',
  nameEn: 'Indonesian'
})
```

### 3. 删除自定义语言

```typescript
// 删除泰语
configStore.removeCustomLanguage('th')
```

### 4. 获取语言信息

```typescript
// 根据 Android 代码查找
const langInfo = langManager.getLanguageInfoByAndroidCode('th')
if (langInfo) {
  console.log(langInfo.nameCn) // '泰语'
}

// 根据 values 目录名查找
const dirInfo = langManager.getLanguageInfoByValuesDir('values-th')
```

## 常见语言代码参考

### 亚洲语言
- `zh-rCN` - 简体中文（中国）
- `zh-rHK` - 繁体中文（香港）
- `zh-rTW` - 繁体中文（台湾）
- `ja` - 日语
- `ko` - 韩语
- `th` - 泰语
- `vi` - 越南语
- `id` - 印尼语
- `ms` - 马来语
- `tl` - 菲律宾语

### 欧洲语言
- `de` - 德语
- `fr` - 法语
- `es` - 西班牙语
- `it` - 意大利语
- `pt` - 葡萄牙语
- `ru` - 俄语
- `nl` - 荷兰语
- `pl` - 波兰语
- `tr` - 土耳其语
- `sv` - 瑞典语
- `da` - 丹麦语
- `no` - 挪威语
- `fi` - 芬兰语
- `cs` - 捷克语
- `hu` - 匈牙利语
- `ro` - 罗马尼亚语
- `el` - 希腊语

### 中东和非洲语言
- `ar` - 阿拉伯语
- `iw` - 希伯来语
- `fa` - 波斯语
- `ur` - 乌尔都语
- `sw` - 斯瓦希里语
- `am` - 阿姆哈拉语

### 其他语言
- `hi` - 印地语
- `bn` - 孟加拉语
- `gu` - 古吉拉特语
- `ta` - 泰米尔语
- `te` - 泰卢固语
- `mr` - 马拉地语
- `ur` - 乌尔都语

## 验证规则

添加自定义语言时会自动验证：

1. **代码格式验证**：
   - 必须以字母开头
   - 长度为 2-3 个字符
   - 可选包含 `-r` 后缀（如 `zh-rCN`）

2. **重复检查**：
   - 不能与现有默认语言重复
   - 不能与其他自定义语言重复

3. **自动生成 values 目录名**：
   - 自动转换为 `values-<androidCode>` 格式
   - 如：`th` → `values-th`，`zh-rCN` → `values-zh-rCN`

## 配置存储

自定义语言配置保存在应用配置中：
- 浏览器：localStorage

格式：
```json
{
  "customLanguages": [
    {
      "androidCode": "th",
      "nameCn": "泰语",
      "nameEn": "Thai",
      "valuesDirName": "values-th"
    }
  ]
}
```

## 注意事项

1. **语言代码大小写**：
   - Android 语言代码通常使用小写
   - 地区代码部分使用大写（如 `rCN`, `rHK`）

2. **翻译质量**：
   - 自定义语言的翻译质量取决于 AI 模型支持
   - 建议使用英文名称以获得更好效果

3. **性能考虑**：
   - 自定义语言数量不影响性能
   - 建议不要超过 100 种语言

4. **文件管理**：
   - 自定义语言对应的 `values-<code>` 目录会自动创建
   - 支持所有语言变体

## 兼容性

- ✅ 完全向后兼容现有项目
- ✅ 保留所有默认语言
- ✅ 现有翻译功能不受影响
- ✅ 支持旧代码和新代码混合使用

## 后续扩展

未来可以增加的功能：
1. 语言导入/导出
2. 语言包管理
3. 语言优先级设置
4. 自动检测项目语言
5. 语言使用统计

---

**更新日期**: 2025-11-19
**版本**: v2.0.0
