# Android Trans Tool Plus

一个基于 AI 的 Android 字符串资源翻译助手，支持多语言同步、智能翻译与差异校验

## 🤖 前言

### 项目起源
本项目是基于本人开发的 Flutter 项目 [Android Trans Tool](https://github.com/huanfeng/AndroidTransTool) 使用 Web 技术栈进行的重写。核心代码（90%+）由 AI 生成并持续迭代优化。

### AI 翻译优势
- **成本效益**: 最新 AI 翻译成本极低，推荐使用 `gpt-5-mini`
- **质量保证**: 翻译质量高，智能处理占位符（如 `%1$s`、`%2$d`）
- **格式兼容**: 正确识别和保留 Android 字符串资源格式

### 功能特性
- ✅ 支持 `string` 和 `string-array` 资源类型
- ✅ 表格内联编辑，所见即所得
- ✅ 支持批量翻译和单个条目精准翻译
- ✅ 实时差异检测和未保存标记

## ✨ 核心特性

### 🔒 安全可靠
- 纯本地处理，项目文件不上传云端
- 保存前差异预览，可撤销操作
- 配置数据加密存储

### 🚀 高效翻译
- 一键批量翻译缺失项
- 智能占位符处理（%1$s、%2$d 等）
- 表格内联编辑，所见即所得

### 🌏 多语言支持
- 内置主流语言集
- 自定义语言代码（如 `th`、`zh-rHK`）
- 多语言同步与差异校验

## ⚙️ 环境要求

### 运行环境
- Node.js ≥ 18
- pnpm ≥ 8

### 浏览器支持
| 浏览器 | 版本 | File System Access API | 状态 |
|--------|------|------------------------|------|
| Chrome  | 86+  | ✅ 完全支持            | 推荐 |
| Edge    | 86+  | ✅ 完全支持            | 推荐 |
| Firefox | 未支持 | ❌ 不支持              | - |
| Safari  | 未支持 | ❌ 不支持              | - |

> 💡 提示：如果需要自部署，File System Access API 需要 HTTPS 环境，否则只能在 localhost 上正常运行

## 🚀 快速上手
```bash
pnpm install        # 安装依赖
pnpm dev            # 本地开发（默认 5173）
pnpm build          # 生产构建
pnpm preview        # 预览构建产物

pnpm test           # 交互测试
pnpm test:run       # 静默测试
pnpm test:coverage  # 覆盖率报告

pnpm format         # 自动格式化
pnpm format:check   # 仅检查
pnpm clean          # 清理缓存/产物
pnpm clean:all      # 深度清理
```

## 🧭 使用流程

### 场景一：新建多语言项目
1) **配置 API**：在设置中填写兼容 OpenAI 的 `API URL`、`API Key`（可选 HTTP 代理），测试连接后保存。
2) **打开项目**：选择含 `res/values*/strings.xml` 的根目录，自动扫描资源。
3) **选择语言**：勾选目标语言，可按 `androidCode`（如 `th`、`zh-rCN`）添加自定义语言。
4) **一键翻译**：自动定位缺失项，分批调用模型填充。

### 场景二：补充缺失翻译
1) **打开项目**：选择已有多语言项目目录
2) **查看缺失项**：系统自动标识缺失翻译的条目
3) **批量翻译**：选择缺失项进行批量翻译，或单个精准翻译
4) **手动校对**：表格内联编辑，未保存项会高亮标记

### 场景三：多语言同步
1) **对比差异**：查看不同语言的翻译完整性
2) **同步修改**：将新增或修改的键值对同步到其他语言
3) **保存文件**：点击"保存"后直接写入原 XML，不可撤销，请务必提前备份

## 🏗️ 技术架构

### 目录结构
```
src/
├── adapters/     # 文件系统适配层（支持本地文件操作）
├── models/       # 核心数据模型（Language、Resource 等）
├── services/     # 业务逻辑服务（翻译引擎、文件处理）
├── stores/       # Pinia 状态管理（项目状态持久化）
├── components/   # Vue 组件库（表格编辑器、设置面板）
└── utils/        # 工具函数（XML 解析、格式校验）

tests/            # Vitest + happy-dom
public/           # 静态资源
docs/             # 架构、格式化等文档
```

### 技术栈
- **前端框架**: Vue 3 + Composition API
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **构建工具**: Vite
- **测试**: Vitest + happy-dom

## 👥 协作规范

### 代码质量
- **格式化**: Prettier (2空格、单引号、行宽100)
- **代码检查**: ESLint (Vue 3 + TypeScript)
- **测试覆盖**: ≥80% (Vitest + happy-dom)

### 提交规范
- 功能开发: `feat: 新增批量翻译功能`
- 问题修复: `fix: 修复占位符解析错误`
- 文档更新: `docs: 更新使用指南`

### 环境命令
```bash
# 开发
pnpm dev              # 本地开发 (端口:5173)
pnpm build            # 生产构建
pnpm preview          # 预览构建产物

# 质量保证
pnpm test             # 交互测试
pnpm test:coverage    # 覆盖率报告
pnpm format:check     # 代码格式检查

# 维护
pnpm clean            # 清理构建产物
```

## 🛡️ 安全与隐私

### 数据处理
- **本地优先**: 所有文件操作均在浏览器本地完成
- **云端最小化**: 仅调用配置的 AI 翻译服务
- **存储策略**: 配置数据使用 `android_trans_*` 前缀存储在 localStorage

### 使用建议
- ⚠️ 保存操作不可撤销，建议使用版本控制
- 💾 重要项目请提前备份
- 🔐 API Key 建议定期更换

### 免责声明
本工具仅作为辅助手段，不保证翻译结果的准确性和适用性。使用者应根据实际需求进行人工校对和最终确认。

## 📜 License
MIT License
