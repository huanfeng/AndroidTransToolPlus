# Android String-Array 翻译功能说明

## 功能概述

本次更新为 Android 翻译工具增加了对 `string-array` 资源的翻译支持。现在可以像翻译普通字符串一样翻译字符串数组，数组元素会被自动拆解为独立字符串进行翻译，翻译完成后会恢复到原始的索引位置。

## 实现原理

### 1. 翻译流程
```
string-array 原始数据
    ↓
[元素0, 元素1, 元素2, ...]
    ↓
逐个翻译每个元素
    ↓
[翻译0, 翻译1, 翻译2, ...]
    ↓
保存到对应索引位置
```

### 2. 错误处理
- 如果某个数组元素翻译失败，系统会保留该元素的原文
- 其他成功的元素仍会被正确翻译
- 会在日志中记录失败的元素信息

## 修改内容

### 1. 翻译服务层 (`src/services/translation/openai.ts`)

**新增功能**：
- `translateArray()` 方法：专门处理字符串数组翻译
- 支持批量翻译中的数组类型
- 支持分批翻译中的数组类型

**接口更新**：
```typescript
// BatchTranslateRequest 支持 string | string[]
items: Array<{
  key: string
  text: string | string[]  // 支持数组
  context?: string
}>

// BatchTranslateResponse 支持 string | string[]
results: Map<string, string | string[]>
```

### 2. 状态管理层 (`src/stores/translation.ts`)

**批量翻译模式**：
- 移除了对数组类型的跳过逻辑
- 现在会为每个数组资源创建翻译任务

**任务翻译模式**：
- 支持逐个翻译数组元素
- 失败元素保留原文
- 详细的进度日志

## 使用方法

### 1. 准备工作

确保您的 Android 项目中有 `string-array` 资源，例如：

**values/strings.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string-array name="weekdays">
        <item>Monday</item>
        <item>Tuesday</item>
        <item>Wednesday</item>
        <item>Thursday</item>
        <item>Friday</item>
        <item>Saturday</item>
        <item>Sunday</item>
    </string-array>

    <string-array name="colors">
        <item>Red</item>
        <item>Green</item>
        <item>Blue</item>
    </string-array>
</resources>
```

### 2. 翻译操作

1. **打开项目**：使用工具打开包含 Android 资源的项目目录
2. **选择文件**：选择包含 string-array 的 XML 文件（如 strings.xml）
3. **选择语言**：选择目标翻译语言
4. **开始翻译**：
   - **批量翻译**：点击"批量翻译"按钮，系统会自动处理所有资源，包括 string-array
   - **任务翻译**：可以逐个翻译资源项

### 3. 查看结果

翻译完成后，数组会被保存到对应的 `values-<lang>/strings.xml` 文件中：

**values-zh/strings.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string-array name="weekdays">
        <item>星期一</item>
        <item>星期二</item>
        <item>星期三</item>
        <item>星期四</item>
        <item>星期五</item>
        <item>星期六</item>
        <item>星期日</item>
    </string-array>

    <string-array name="colors">
        <item>红色</item>
        <item>绿色</item>
        <item>蓝色</item>
    </string-array>
</resources>
```

## 注意事项

### 1. 性能考虑
- 数组元素是逐个翻译的，如果数组很大，翻译时间会相应增加
- 建议单个数组的元素数量不超过 100 个

### 2. 上下文信息
- 每个数组元素在翻译时会包含上下文信息，格式为 `数组名[索引]`
- 这有助于 AI 模型理解元素在数组中的作用，产生更准确的翻译

### 3. 翻译质量
- 如果数组中的元素具有相关性（如星期、月份等），建议在自定义提示词中说明
- 可以在设置中添加额外提示词以提高翻译一致性

### 4. 错误处理
- 翻译失败的元素会保留原文，不会导致整个数组丢失
- 可以在日志中查看具体的错误信息

## 日志示例

### 成功翻译数组
```
[DEBUG] Translating array weekdays -> cn
[DEBUG] Translated array weekdays to cn (7 items)
[TRACE] Applied array translation: weekdays -> cn
```

### 部分元素翻译失败
```
[WARN] Some array elements failed to translate for weekdays: Index 3: Translation failed
[DEBUG] Translated array weekdays to cn (7 items)
[TRACE] Applied array translation: weekdays -> cn
```

## 兼容性

- ✅ 完全向后兼容，现有的 string 翻译不受影响
- ✅ 支持所有现有的语言
- ✅ 支持所有翻译模式（批量、任务、快速）
- ✅ 保持原有的数据结构和接口

## 常见问题

### Q: 为什么数组翻译比字符串翻译慢？
A: 因为数组的每个元素都需要单独调用翻译 API，即使在批量模式下，系统也会逐个翻译元素以确保翻译质量和索引对应关系。

### Q: 如果一个数组有 50 个元素，会有 50 个 API 调用吗？
A: 是的，系统会逐个翻译每个元素。这是必要的，因为：
1. 数组元素通常是相关的，需要保持一致性
2. 每个元素的上下文不同（通过索引区分）
3. 可以更好地处理部分失败的情况

### Q: 可以跳过数组类型只翻译字符串吗？
A: 不可以，系统现在已经统一处理 string 和 string-array。数组会被自动识别和处理。

### Q: 翻译后的数组顺序会改变吗？
A: 不会。系统会严格保持数组的原始索引顺序，翻译后的元素会被放回对应的位置。

---

**更新日期**: 2025-11-19
**版本**: v1.1.0
