# Android Trans Tool Plus

> 基于 Vue 3 + TypeScript + Element Plus + Vite 的 Android 应用国际化翻译工具

Android Trans Tool Plus 是一个强大的 Android 应用国际化翻译工具，通过 OpenAI GPT 模型自动化翻译 Android 字符串资源文件。

## ✨ 特性

- 🌍 **多语言支持**：支持 13 种语言的自动翻译
- 🤖 **AI 翻译**：基于 OpenAI GPT-4o Mini 模型，翻译质量高
- 📦 **批量处理**：智能分块，支持大量字符串的批量翻译
- 💾 **本地处理**：所有数据在本地处理，保护隐私
- 🎨 **Material Design 3**：现代化的 UI 设计
- ⚡ **高性能**：使用 Vite 构建，启动快速
- 🌐 **浏览器支持**：基于 File System Access API，支持 Chrome/Edge 86+

## 📋 支持的语言

- 🇨🇳 简体中文 (zh-rCN)
- 🇭🇰 繁体中文 (zh-rHK / zh-rTW)
- 🇯🇵 日语 (ja)
- 🇰🇷 韩语 (ko)
- 🇸🇦 阿拉伯语 (ar)
- 🇩🇪 德语 (de)
- 🇫🇷 法语 (fr)
- 🇮🇳 印地语 (hi)
- 🇮🇹 意大利语 (it)
- 🇮🇱 希伯来语 (iw)
- 🇷🇺 俄语 (ru)
- 🇺🇦 乌克兰语 (uk)

## 🔧 技术栈

### 前端

- **Vue 3.5** - 渐进式 JavaScript 框架
- **TypeScript 5.9** - JavaScript 的超集
- **Element Plus** - Vue 的 UI 组件库
- **Vite 7** - 下一代前端构建工具
- **Pinia** - Vue 的状态管理库

### 工具库

- **fast-xml-parser** - XML 解析和生成
- **axios** - HTTP 客户端
- **lodash-es** - JavaScript 工具库

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- **pnpm >= 8** (推荐使用 pnpm 作为包管理器)

> **为什么使用 pnpm？** 更快的安装速度（2-3倍）、更少的磁盘空间占用、更严格的依赖管理。详见 [pnpm 使用指南](./docs/PNPM_GUIDE.md)

### 安装 pnpm

**Windows**

```powershell
# 推荐：使用 npm 全局安装
npm install -g pnpm

# 或使用 Scoop
scoop install nodejs-lts pnpm

# 验证安装
pnpm --version
```

**macOS / Linux**

```bash
# 使用 npm
npm install -g pnpm

# 或使用安装脚本
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 安装依赖

```powershell
# 使用 pnpm
pnpm install

# 或使用 just 命令（推荐）
just install
```

### 使用 Just 命令（推荐）

本项目配置了 [just](https://github.com/casey/just) 命令运行器，提供了更便捷的开发体验。

> **Windows 用户特别说明**: justfile 已完全兼容 Windows，使用 PowerShell 作为默认 shell。详见 [Windows 使用指南](./docs/WINDOWS_GUIDE.md)。

#### 安装 Just

**Windows (推荐使用 Scoop)**

```powershell
# 安装 Scoop（如果还没有）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 安装 just
scoop install just
```

**Windows (其他方式)**

```powershell
# 使用 Chocolatey
choco install just

# 使用 winget
winget install --id Casey.Just

# 使用 Cargo
cargo install just
```

**macOS**

```bash
brew install just
```

**Linux**

```bash
cargo install just
```

#### 验证安装

```powershell
# Windows (PowerShell)
just --version

# 测试环境（Windows）
.\test-just.ps1
```

#### 常用命令

```bash
# 查看所有命令
just --list

# 初始化项目
just init

# 启动开发服务器
just dev

# 构建生产版本
just build

# 运行代码检查
just check

# 查看详细帮助
just help
```

> 📖 详细的命令使用说明请查看 [Just 命令使用指南](./docs/JUST_COMMANDS.md)

### 使用 pnpm 命令（传统方式）

#### 开发

```powershell
pnpm dev
```

访问 http://localhost:5173

### 构建

```powershell
pnpm build
```

构建产物在 `dist/` 目录下，可以直接部署到静态服务器。

## 📖 使用指南

### 1. 配置 API

首次使用需要配置 OpenAI API：

1. 打开应用
2. 点击"设置"按钮
3. 在"API 设置"标签页中：
   - 输入 **API URL**（默认：https://api.openai.com/v1）
   - 输入 **API Key**（从 OpenAI 获取）
   - （可选）配置 HTTP 代理
4. 点击"测试连接"验证配置
5. 在"翻译语言"标签页选择需要的语言

### 2. 打开项目

1. 点击"打开 Android 项目"按钮
2. 选择 Android 项目根目录
3. 应用会自动扫描所有 `res` 目录

### 3. 翻译资源

#### 一键翻译（推荐）

1. 选择资源目录和文件
2. 点击"一键翻译"按钮
3. 选择翻译选项：
   - ☑ 自动选择需要翻译的语言
   - ☑ 翻译完成后自动保存
4. 等待翻译完成

#### 手动选择语言翻译

1. 选择资源目录和文件
2. 在表格列头勾选需要翻译的语言
3. 点击"翻译选中语言"
4. 等待翻译完成
5. 点击"保存"按钮

### 4. 查看和编辑

- 数据表格显示所有资源和翻译
- 未翻译项显示红色边框
- 已翻译未保存项显示蓝色边框
- 支持单元格内联编辑

## 📁 项目结构

```
android_trans_tool_plus/
├── docs/                          # 文档
│   ├── PRD.md                    # 产品需求文档
│   ├── ARCHITECTURE.md           # 技术架构文档
│   └── PNPM_GUIDE.md             # pnpm 使用指南
├── src/                           # 源代码
│   ├── adapters/                 # 平台适配层
│   │   ├── filesystem/          # 文件系统适配
│   │   ├── storage/             # 存储适配
│   │   └── platform/            # 平台检测
│   ├── models/                   # 数据模型
│   ├── stores/                   # Pinia 状态管理
│   ├── services/                 # 服务层
│   ├── components/               # Vue 组件
│   ├── utils/                    # 工具函数
│   └── types/                    # TypeScript 类型
└── public/                       # 静态资源
```

## 🌐 浏览器兼容性

需要支持 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) 的浏览器：

- ✅ Chrome 86+
- ✅ Edge 86+
- ⚠️ Firefox（需要启用实验性功能）
- ❌ Safari（不支持）

> **建议**：使用 Chrome 或 Edge 浏览器以获得最佳体验。

## 🔒 隐私和安全

- **本地处理**：所有文件操作和数据处理都在本地进行
- **不上传文件**：项目文件不会上传到任何服务器
- **API 存储**：API Key 存储在本地 localStorage
- **HTTPS 通信**：与 OpenAI API 的通信使用 HTTPS 加密

## 📝 配置文件

### 应用配置

配置保存在浏览器 localStorage 中，包括：

- API URL 和 Token
- HTTP 代理设置
- 启用的翻译语言
- 翻译批次大小
- 重试配置

### 项目配置（可选）

可在 Android 项目根目录创建 `android_trans.json`：

```json
{
  "resDirs": [
    "app/src/main/res",
    "module1/src/main/res"
  ],
  "excludeFiles": [
    "strings_untranslatable.xml"
  ]
}
```

## 🛠️ 开发

### 核心概念

#### 平台适配层

基于 File System Access API 的浏览器文件系统适配：

```typescript
// 统一接口
interface FileSystemAdapter {
  selectDirectory(): Promise<DirectoryHandle | null>
  readFile(handle: FileHandle): Promise<string>
  writeFile(handle: FileHandle, content: string): Promise<void>
  // ...
}

// 浏览器实现 (使用 File System Access API)
class BrowserFileSystem implements FileSystemAdapter { }
```

#### 状态管理

使用 Pinia 管理应用状态：

- **configStore** - 应用配置
- **projectStore** - 项目和资源数据
- **translationStore** - 翻译状态和进度
- **logStore** - 日志记录

### 添加新功能

1. 在 `src/services/` 中实现业务逻辑
2. 在 `src/stores/` 中创建或更新状态
3. 在 `src/components/` 或 `src/views/` 中实现 UI
4. 更新相关文档

## 📚 文档

详细文档请查看 `docs/` 目录：

- [PRD.md](./docs/PRD.md) - 产品需求文档
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - 技术架构文档

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可

MIT License

## 🔗 相关链接

- [Vue 3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Vite 文档](https://vitejs.dev/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

## 💬 反馈

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 加入讨论组

---

**Happy Translating! 🎉**
