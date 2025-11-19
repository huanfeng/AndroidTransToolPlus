# 单引号转义修复说明

## 问题
在保存XML文件时，原始文本中的单引号（'）被错误地转义为 `\'`，导致Android编译器报错。

## 解决方案
移除了对单引号的转义处理。在Android的strings.xml中：

### 需要转义的字符：
- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`（在属性值中）

### 不需要转义的字符：
- `'` （单引号）在文本内容中通常不需要转义

## 修改文件
- `src/services/xml/generator.ts` - `escapeXmlText()` 函数

## 测试用例
参见 `quote_test.xml`，包含以下测试场景：
- 单引号：I can't do this
- 多个单引号：It's a beautiful day, isn't it?
- 双引号：He said "Hello world"
- 混合引号：I'm saying "Hello" to you
- 与符号：This & that
- 小于号：Value < 100
- 大于号：Value > 50

## 验证
这些字符在生成XML时会被正确处理：
- `&`, `<`, `>` 由fast-xml-parser自动转义
- `'` 保持原样，不进行转义
- `\n` 保留为转义的换行符

## 兼容性
- ✅ Android 编译器可以正常编译
- ✅ XML格式正确
- ✅ 向后兼容现有功能
