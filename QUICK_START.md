# 快速开始指南

> 5 分钟快速上手 Android Trans Tool Plus

## 📋 前置要求

- ✅ Node.js >= 18
- ✅ **pnpm >= 8** (包管理器)
- ✅ [Just](https://github.com/casey/just)（可选但推荐）

## 🚀 第一步：安装 Just（推荐）

Just 是一个命令运行器，让开发更简单。

### Windows
```powershell
scoop install just
```

### macOS
```bash
brew install just
```

### Linux
```bash
cargo install just
```

## 📦 第二步：安装 pnpm（如果还没有）

```powershell
# Windows
npm install -g pnpm

# 验证安装
pnpm --version
```

## 🎯 第三步：初始化项目

```powershell
# 克隆或进入项目目录
cd android_trans_tool_plus

# 安装依赖
just install
# 或使用 pnpm
pnpm install
```

## 💻 第四步：启动开发服务器

```powershell
# 启动 Web 版本
just dev
# 或使用 pnpm
pnpm dev
```

访问 http://localhost:5173

## ⚙️ 第五步：配置 OpenAI API

1. 打开应用
2. 点击 **"设置"** 按钮
3. 在 **"API 设置"** 标签页：
   - 输入 API URL（默认：`https://api.openai.com/v1`）
   - 输入 API Token（从 [OpenAI](https://platform.openai.com/api-keys) 获取）
4. 点击 **"测试连接"** 验证
5. 在 **"翻译语言"** 标签页选择需要的语言

## 🎉 第六步：开始翻译

1. 点击 **"打开 Android 项目"**
2. 选择 Android 项目根目录
3. 选择资源目录和文件
4. 点击 **"一键翻译"**

## 📝 常用命令速查

| 任务 | Just 命令 | pnpm 命令 |
|------|-----------|----------|
| 安装依赖 | `just install` | `pnpm install` |
| 启动开发 | `just dev` | `pnpm dev` |
| 构建生产 | `just build` | `pnpm build` |
| 添加依赖 | `just add <pkg>` | `pnpm add <pkg>` |
| 代码检查 | `just check` | - |
| 格式化 | `just format` | - |
| 清理重置 | `just reset` | - |
| 查看帮助 | `just help` | - |

## 🔍 浏览器兼容性

推荐使用以下浏览器：

- ✅ **Chrome 86+** （推荐）
- ✅ **Edge 86+**
- ⚠️ Firefox（需启用实验性功能）
- ❌ Safari（不支持 File System Access API）

如果浏览器不支持，请使用 Tauri 桌面版：

```bash
# 启动 Tauri 开发版
just tauri-dev
# 或
npm run tauri:dev

# 构建 Tauri 应用
just tauri-build
# 或
npm run tauri:build
```

## 📚 下一步

- 📖 阅读 [完整文档](./README.md)
- 📖 查看 [Just 命令指南](./docs/JUST_COMMANDS.md)
- 📖 了解 [产品需求](./docs/PRD.md)
- 📖 学习 [技术架构](./docs/ARCHITECTURE.md)

## ❓ 遇到问题？

### 端口被占用

```bash
# 指定其他端口
just dev-port 8080
```

### 依赖安装失败

```bash
# 清理并重新安装
just reset
```

### 代码格式错误

```bash
# 自动格式化
just format
```

### 类型检查失败

```bash
# 运行类型检查
just typecheck
```

## 🎯 典型工作流

### 每天开始工作

```bash
git pull              # 拉取最新代码
just install          # 安装新依赖（如果有）
just dev             # 启动开发服务器
```

### 提交代码前

```bash
just check           # 运行所有检查
just format          # 格式化代码
git add .
just commit "feat: 添加新功能"
```

### 发布新版本

```bash
just pre-release     # 发布前检查
just build           # 构建 Web 版本
just tauri-build     # 构建桌面版本（可选）
```

## 💡 小贴士

1. **使用 Just 命令**：更短、更易记、更强大
2. **定期更新依赖**：`just outdated` 查看过时的包
3. **保持代码整洁**：定期运行 `just check`
4. **查看项目状态**：`just stats` 查看代码统计

---

**准备好了吗？** 运行 `just dev` 开始你的翻译之旅！ 🚀
