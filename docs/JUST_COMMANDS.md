# Just 命令使用指南

本项目使用 [just](https://github.com/casey/just) 作为命令运行器，提供了一系列便捷的开发命令。

## 安装 Just

### Windows

```powershell
# 使用 Scoop
scoop install just

# 使用 Chocolatey
choco install just

# 使用 Cargo
cargo install just
```

### macOS

```bash
# 使用 Homebrew
brew install just
```

### Linux

```bash
# 使用 Cargo
cargo install just

# Ubuntu/Debian
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin
```

## 快速开始

### 查看所有命令

```bash
just --list
# 或
just
```

### 查看详细帮助

```bash
just help
```

## 常用命令

### 🚀 开发工作流

#### 首次使用

```bash
# 初始化项目（安装依赖）
just init
```

#### 日常开发

```bash
# 启动 Web 开发服务器
just dev

# 启动 Tauri 桌面版开发
just tauri-dev

# 启动并自动打开浏览器
just dev-open

# 指定端口启动
just dev-port 8080
```

#### 快捷工作流

```bash
# 完整的开发工作流：清理 -> 安装 -> 启动
just fresh

# 重启开发服务器
just restart
```

### 🔨 构建

```bash
# 构建 Web 生产版本
just build

# 构建 Tauri 桌面应用
just tauri-build

# 预览生产构建
just preview

# 构建并预览
just build-preview
```

### 🔍 代码质量

```bash
# TypeScript 类型检查
just typecheck

# 格式化代码
just format

# 检查代码格式
just format-check

# Lint 检查
just lint

# 修复 Lint 问题
just lint-fix

# 运行所有检查
just check

# 发布前检查（类型检查 + 格式检查 + 构建）
just pre-release
```

### 🧹 清理

```bash
# 清理构建产物
just clean

# 清理 node_modules
just clean-deps

# 清理 Tauri 构建产物
just clean-tauri

# 深度清理（所有构建产物和依赖）
just clean-all

# 清理并重新安装
just reset
```

### 📚 文档

```bash
# 查看所有文档
just docs

# 查看产品需求文档
just doc-prd

# 查看技术架构文档
just doc-arch
```

### 🔧 依赖管理

```bash
# 安装依赖
just install

# 安装 Tauri CLI
just install-tauri

# 查看过时的依赖
just outdated

# 更新依赖
just update

# 审计依赖安全性
just audit

# 修复依赖安全问题
just audit-fix
```

### 📊 项目信息

```bash
# 查看项目信息
just info

# 查看项目统计
just stats

# 查看项目状态
just status
```

### 🦀 Tauri 专用

```bash
# 初始化 Tauri 项目（首次）
just tauri-init

# 查看 Tauri 信息
just tauri-info

# 生成 Tauri 图标
just tauri-icon path/to/icon.png
```

### 🔀 Git 相关

```bash
# 查看项目状态
just status

# 快速提交
just commit "feat: 添加新功能"

# 提交并推送
just push "feat: 添加新功能"
```

## 典型使用场景

### 场景 1：开始一天的工作

```bash
# 拉取最新代码
git pull

# 安装新的依赖（如果有）
just install

# 启动开发服务器
just dev
```

### 场景 2：提交代码前

```bash
# 运行所有检查
just check

# 格式化代码
just format

# 修复 Lint 问题
just lint-fix

# 提交代码
just commit "feat: 实现翻译功能"
```

### 场景 3：发布新版本

```bash
# 发布前检查
just pre-release

# 构建 Web 版本
just build

# 构建 Tauri 桌面版本
just tauri-build

# 测试构建产物
just preview
```

### 场景 4：遇到奇怪的问题

```bash
# 深度清理
just clean-all

# 重新安装
just install

# 启动开发服务器
just dev
```

### 场景 5：查看项目状态

```bash
# 查看详细信息
just info

# 查看代码统计
just stats

# 检查过时的依赖
just outdated
```

## 自定义命令

如果你需要添加自定义命令，可以编辑项目根目录的 `justfile`：

```just
# 自定义命令示例
my-command:
  @echo "执行自定义命令..."
  # 你的命令
```

## 命令组合

Just 支持命令组合，例如：

```bash
# 依次执行多个命令
just clean build preview

# 使用命令依赖（在 justfile 中定义）
build-preview: build preview
```

## 常见问题

### Q: Just 命令找不到？

A: 确保 just 已正确安装并在 PATH 中：

```bash
# 检查 just 版本
just --version
```

### Q: 权限错误？

A: 在 Windows 上可能需要以管理员身份运行某些命令。

### Q: 某些命令不工作？

A: 确保已运行 `just install` 安装所有依赖。

### Q: 如何查看命令的具体执行内容？

A: 使用 `--dry-run` 参数：

```bash
just --dry-run build
```

## 与 npm scripts 的对比

| npm scripts | just 命令 | 优势 |
|-------------|----------|------|
| `npm run dev` | `just dev` | 更短，更易记 |
| `npm run build && npm run preview` | `just build-preview` | 支持命令组合 |
| `rm -rf dist && npm install` | `just reset` | 跨平台兼容 |
| - | `just help` | 内置帮助文档 |

## 参考资料

- [Just 官方文档](https://just.systems/)
- [Just GitHub 仓库](https://github.com/casey/just)
- [项目 justfile](../justfile)

---

**提示**: 运行 `just help` 查看完整的命令列表和说明。
