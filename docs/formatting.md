# 代码格式化配置指南

## 概述

本项目已配置自动代码格式化功能，支持 TypeScript、Vue、JavaScript、JSON、CSS、SCSS 和 Markdown 文件。格式化规则遵循 TypeScript 和 Vue 的最佳实践。

## 格式化规则

### 代码风格

- **分号**: 不使用分号 (semi: false)
- **引号**: 使用单引号 (singleQuote: true)
- **缩进**: 2 个空格 (tabWidth: 2)
- **行宽**: 最大 100 字符 (printWidth: 100)
- **尾随逗号**: ES5 标准 (trailingComma: "es5")
- **箭头函数**: 避免不必要的括号 (arrowParens: "avoid")
- **换行符**: LF (endOfLine: "lf")
- **Vue 文件**: script 和 style 标签不额外缩进

## 使用方式

### 1. 命令行格式化

```bash
# 格式化所有代码文件
pnpm format

# 检查文件是否已格式化（不会修改文件）
pnpm format:check
```

### 2. VSCode 自动格式化（推荐）

安装以下 VSCode 插件：

- **Prettier - Code formatter** (esbenp.prettier-vscode) - 必须
- **ESLint** (dbaeumer.vscode-eslint) - 推荐

安装插件后，配置会自动生效：

- ✅ **保存时自动格式化** (`editor.formatOnSave: true`)
- ✅ **粘贴时自动格式化** (`editor.formatOnPaste: true`)
- ✅ **默认格式化工具**: Prettier
- ✅ **保存时自动修复 ESLint 问题** (`source.fixAll.eslint`)

**支持的自动格式化文件类型**:
- `.vue` - Vue 单文件组件
- `.ts` / `.js` - TypeScript / JavaScript
- `.json` - JSON 配置文件
- `.scss` / `.css` - 样式文件
- `.md` - Markdown 文档

### 3. 编辑器一致性配置

项目包含 `.editorconfig` 文件，确保在任何编辑器中都能保持一致的代码风格：

- UTF-8 编码
- LF 换行符
- 移除行尾空格
- 2 空格缩进
- 文件末尾插入空行

大多数现代编辑器都支持 EditorConfig，无需额外配置。

## 配置文件说明

### `.prettierrc`

Prettier 格式化器的配置文件，定义了所有格式化规则和 Vue 文件的特殊处理。

### `.vscode/settings.json`

VSCode 工作区设置，确保：
- Prettier 作为默认格式化工具
- 保存时自动格式化
- 自动修复 ESLint 问题
- 针对不同文件类型的具体配置

### `.editorconfig`

跨编辑器配置文件，确保代码在任何编辑器中都能保持一致的风格。

## 格式化效果示例

### Vue 文件
```vue
<!-- 格式化前 -->
<template>
  <div class="container">
    <h1>{{  title  }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Hello World')
</script>
```

```vue
<!-- 格式化后 -->
<template>
  <div class="container">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('Hello World')
</script>
```

### TypeScript 文件
```typescript
// 格式化前
function  greet(name:string):string{
  return `Hello, ${name}`
}

// 格式化后
function greet(name: string): string {
  return `Hello, ${name}`
}
```

## 最佳实践

1. **提交前格式化**: 在提交代码前运行 `pnpm format` 确保代码格式统一
2. **保存即格式化**: 在 VSCode 中启用保存时自动格式化，无需手动操作
3. **CI/CD 检查**: 使用 `pnpm format:check` 在 CI/CD 流水线中检查代码格式
4. **团队协作**: 所有团队成员都应使用相同的编辑器配置（通过 .vscode/settings.json）

## 故障排除

### 格式化不生效

1. **检查 VSCode 插件**: 确保已安装 Prettier 插件
2. **检查文件类型**: 确保文件扩展名在支持列表中
3. **重启编辑器**: 重启 VSCode 加载新配置

### 格式化与 ESLint 冲突

项目已配置 Prettier 与 ESLint 兼容：
- Prettier 负责代码风格
- ESLint 负责代码质量
- 保存时自动运行 `eslint --fix`

### 修改格式化规则

如需修改格式化规则，编辑 `.prettierrc` 文件并重启编辑器或重新运行格式化命令。

## 相关资源

- [Prettier 官方文档](https://prettier.io/)
- [Vue 风格指南](https://cn.vuejs.org/style-guide/)
- [TypeScript 最佳实践](https://typescript-eslint.io/rules/)
- [EditorConfig 规范](https://editorconfig.org/)
