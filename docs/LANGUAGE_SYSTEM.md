# 语言系统说明

## 概述

当前语言系统由三部分组成：

- 内置语言：项目预置的常见 Android 语言，开箱可用。
- 默认启用语言：新配置默认勾选的一组常用语言，保持历史行为不变。
- 自定义语言：只在内置语言未覆盖时再补充，适合少数特殊语种或地区变体。

这套设计的目标是减少手工维护自定义语言的频率，同时不改变现有项目默认的翻译目标集合。

## 当前行为

### 1. 内置语言已扩展

除原有的中文、阿拉伯语、德语、法语、日语、韩语、俄语等语言外，系统已新增更多常见 Android 语言预置，例如：

- 亚洲：`th`、`vi`、`id`、`ms`、`tl`、`bn`、`ta`
- 欧洲：`nl`、`pl`、`tr`、`sv`、`da`、`fi`、`cs`、`hu`、`ro`、`el`
- 中东：`fa`、`ur`

这些语言会直接出现在设置页的“可启用的语言”区域，无需再先添加自定义语言。

### 2. 默认启用列表保持不变

虽然内置语言变多了，但默认启用列表没有自动扩容。

默认仍然是这一组语言：

```ts
[
  'def',
  'cn',
  'cnHk',
  'cnTw',
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'iw',
  'ja',
  'ko',
  'pt',
  'ru',
  'uk',
]
```

这样可以避免老用户在升级后突然看到更多默认翻译列。

### 3. 设置页支持三种快速操作

在“已启用语言”区域，当前有三个按钮：

- `添加默认`：补回系统默认那一组语言
- `添加全部`：把当前所有内置和自定义可用语言全部加入启用列表
- `清空`：清空除源语言外的启用语言

### 4. 自定义语言改为小弹窗维护

设置页不再常驻显示大块表单，自定义语言现在采用更紧凑的方式：

- 列表区只展示说明、数量和已添加语言表格
- 点击“添加自定义语言”后，使用小弹窗录入
- 编辑也复用同一个小弹窗

这样可以减少语言设置页的纵向空间占用。

## 核心数据结构

### 内置语言

```ts
type Language = string

interface LanguageInfo {
  code: Language
  androidCode: string
  nameCn: string
  nameEn: string
  valuesDirName: string
}
```

### 自定义语言

```ts
interface CustomLanguage {
  androidCode: string
  nameCn: string
  nameEn: string
  valuesDirName?: string
}
```

说明：

- `androidCode` 是核心标识，例如 `km`、`lo`、`my`
- `valuesDirName` 在代码层仍然支持，但当前设置页 UI 不再单独暴露，默认自动生成

## 关键接口

语言模型主要由 `src/models/language.ts` 提供：

```ts
getBuiltinLanguages()
getDefaultEnabledBuiltinLanguages()
getLanguageByAndroidCode(code)
getLanguageByValuesDirName(dirName)
getLanguageLabel(code, locale)
```

语言查询和自定义扩展由 `LanguageManager` 提供：

```ts
class LanguageManager {
  getAllLanguages(): FullLanguageInfo[]
  getAllLanguageCodes(): string[]
  addCustomLanguage(lang: CustomLanguage): void
  removeCustomLanguage(androidCode: string): boolean
  updateCustomLanguage(androidCode: string, updates): boolean
}
```

## 使用建议

### 优先使用内置语言

如果你需要的是这些常见语言，直接在设置页启用即可，不需要再走自定义：

- `th` 泰语
- `vi` 越南语
- `id` 印度尼西亚语
- `ms` 马来语
- `nl` 荷兰语
- `pl` 波兰语
- `tr` 土耳其语
- `sv` 瑞典语

### 只有在内置未覆盖时再使用自定义语言

适合使用自定义语言的例子：

- `km` 高棉语
- `lo` 老挝语
- `my` 缅甸语
- `sw` 斯瓦希里语
- `am` 阿姆哈拉语
- 特定地区变体，如 `pt-rBR`、`es-rMX`

## 设置页操作流程

### 场景 1：恢复旧的默认语言集合

1. 打开设置页
2. 进入“语言”
3. 点击 `添加默认`
4. 保存设置

### 场景 2：启用全部预置语言

1. 打开设置页
2. 进入“语言”
3. 点击 `添加全部`
4. 保存设置

### 场景 3：补充一个未预置的 Android 语言

1. 打开设置页
2. 进入“语言”
3. 在“自定义语言管理”区域点击 `添加自定义语言`
4. 在小弹窗中填写：
   - Android 代码
   - 中文名称
   - 英文名称
5. 保存后，该语言会自动加入已启用语言列表

## 校验规则

添加自定义语言时会执行以下校验：

1. 代码格式必须符合 Android 语言目录命名约束
2. 不能与现有内置语言重复
3. 不能与已有自定义语言重复
4. `valuesDirName` 未提供时自动生成为 `values-<androidCode>`

当前支持的代码模式示例：

- 简单语言：`km`、`lo`、`sw`
- 地区变体：`zh-rCN`、`pt-rBR`、`es-rMX`

## 配置存储

应用配置保存在本地存储中，相关字段包括：

```json
{
  "enabledLanguages": ["def", "cn", "ja"],
  "targetLanguages": ["ja"],
  "customLanguages": [
    {
      "androidCode": "km",
      "nameCn": "高棉语",
      "nameEn": "Khmer",
      "valuesDirName": "values-km"
    }
  ]
}
```

说明：

- `enabledLanguages` 决定设置页已启用语言、工作台显示列和批量翻译可选目标语言
- `targetLanguages` 用于记忆最近一次批量翻译选择
- `customLanguages` 用于补充内置语言未覆盖的语种

## 兼容性

- 保留原有 `Language` 字符串代码体系
- 老配置不会因为新增内置语言而自动改动默认启用项
- 现有翻译、项目扫描、XML 保存逻辑不受影响

---

更新日期：2026-03-13
