# Windows 使用指南

本项目的 justfile 已针对 Windows 系统进行了完全优化，使用 PowerShell 作为默认 shell。

## 🎯 Windows 特性

### PowerShell 集成

justfile 配置为使用 PowerShell，提供：

- ✅ 彩色输出（使用 `Write-Host -ForegroundColor`）
- ✅ 原生 Windows 路径（使用反斜杠 `\`）
- ✅ PowerShell cmdlets（`Remove-Item`, `Test-Path`, `Get-ChildItem` 等）
- ✅ 智能错误处理（`-ErrorAction SilentlyContinue`）

### 关键改进

#### 1. 文件删除操作
```powershell
# ❌ 旧方式（Unix 命令，Windows 不支持）
rm -rf dist

# ✅ 新方式（PowerShell）
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
```

#### 2. 条件判断
```powershell
# ❌ 旧方式
if command -v code > /dev/null 2>&1; then code file.md; fi

# ✅ 新方式（PowerShell）
if (Get-Command code -ErrorAction SilentlyContinue) { code file.md }
```

#### 3. 变量使用
```powershell
# ❌ 旧方式
echo "Node: $(node --version)"

# ✅ 新方式（PowerShell）
$nodeVer = node --version; Write-Host "Node: $nodeVer"
```

#### 4. 进程管理
```powershell
# ❌ 旧方式
pkill -f "vite"

# ✅ 新方式（PowerShell）
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

## 🚀 安装 Just (Windows)

### 方法 1: 使用 Scoop（推荐）

```powershell
# 安装 Scoop（如果还没有）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 安装 just
scoop install just
```

### 方法 2: 使用 Chocolatey

```powershell
# 以管理员身份运行
choco install just
```

### 方法 3: 使用 Cargo

```powershell
# 需要先安装 Rust
cargo install just
```

### 方法 4: 使用 winget

```powershell
winget install --id Casey.Just
```

### 验证安装

```powershell
just --version
```

## 📋 PowerShell 执行策略

如果遇到执行策略错误，请运行：

```powershell
# 查看当前策略
Get-ExecutionPolicy

# 设置为 RemoteSigned（推荐）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🎨 彩色输出

justfile 使用 PowerShell 的 `-ForegroundColor` 参数提供彩色输出：

| 颜色 | 用途 |
|------|------|
| Cyan | 操作进行中 |
| Green | 成功完成 |
| Yellow | 警告/提示 |
| Red | 错误（自动） |

## 📝 常见问题

### Q1: 命令提示符中能用吗？

A: 推荐使用 PowerShell，但如果必须使用 cmd，可以这样：

```cmd
powershell -Command "just dev"
```

### Q2: Git Bash 中能用吗？

A: 可以，但会使用 PowerShell 执行命令：

```bash
just dev
```

### Q3: 路径中的反斜杠问题

A: justfile 已使用 Windows 风格的路径（反斜杠 `\`）：

```powershell
# 正确
docs\\PRD.md
src-tauri\\target

# 也可以使用
docs/PRD.md  # PowerShell 支持正斜杠
```

### Q4: 如何在 VSCode 终端中使用？

A: VSCode 默认终端应该是 PowerShell。如果不是：

1. 打开命令面板（Ctrl+Shift+P）
2. 搜索 "Terminal: Select Default Profile"
3. 选择 "PowerShell"

### Q5: 重启命令不工作？

A: `just restart` 命令会尝试停止 node 进程。如果不工作，可以手动停止：

```powershell
# 停止所有 node 进程
Get-Process node | Stop-Process -Force

# 然后启动
just dev
```

### Q6: stats 命令速度慢？

A: 统计大量文件时可能较慢。可以使用更快的替代方案：

```powershell
# 仅统计文件数
just info
```

## 🔧 性能优化

### 1. 启用长路径支持

Windows 10 1607+ 支持长路径：

```powershell
# 以管理员身份运行
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### 2. 禁用 Windows Defender 实时扫描（开发目录）

在 Windows Defender 中添加排除项：

- `node_modules` 文件夹
- 项目目录

### 3. 使用 Windows Terminal

推荐使用 [Windows Terminal](https://aka.ms/terminal)：

- 更好的性能
- 更好的 Unicode 支持
- 标签支持
- 自定义主题

## 📚 PowerShell 快速参考

### 常用命令对照

| Unix | PowerShell | 说明 |
|------|------------|------|
| `ls` | `Get-ChildItem` | 列出文件 |
| `rm -rf` | `Remove-Item -Recurse -Force` | 删除文件/文件夹 |
| `cat` | `Get-Content` | 查看文件内容 |
| `grep` | `Select-String` | 搜索文本 |
| `wc -l` | `Measure-Object -Line` | 统计行数 |
| `find` | `Get-ChildItem -Recurse` | 查找文件 |
| `echo` | `Write-Host` | 输出文本 |
| `which` | `Get-Command` | 查找命令 |

### PowerShell 别名

PowerShell 提供了 Unix 风格的别名：

```powershell
ls      # -> Get-ChildItem
cat     # -> Get-Content
pwd     # -> Get-Location
cd      # -> Set-Location
```

## 🎯 Windows 特定的 Just 命令

### 清理命令增强

```powershell
# 清理时会检查路径是否存在
just clean       # 安全删除 dist 和 dist-ssr
just clean-deps  # 安全删除 node_modules
just clean-tauri # 安全删除 src-tauri\target
```

### 文档命令增强

```powershell
# 自动检测 VSCode
just doc-prd     # 如果有 VSCode 则打开，否则显示内容
just doc-arch    # 同上
```

### 统计命令优化

```powershell
# 使用 PowerShell cmdlets 高效统计
just stats       # 文件数、行数、依赖数
```

## 💡 最佳实践

### 1. 使用 Windows Terminal

创建 Windows Terminal 配置文件：

```json
{
  "name": "Android Trans Tool Plus",
  "commandline": "powershell.exe -NoExit -Command \"cd D:\\...\\android_trans_tool_plus\"",
  "icon": "📱"
}
```

### 2. 创建桌面快捷方式

创建 `.bat` 文件：

```batch
@echo off
cd /d D:\Develop\workspace\flutter_project\android_trans_tool_plus
powershell -NoExit -Command "just dev"
```

### 3. 使用任务计划程序

在特定时间自动运行任务（如更新依赖）：

```powershell
# 创建计划任务运行 just update
```

## 🔒 安全性

### 执行策略说明

| 策略 | 说明 | 推荐 |
|------|------|------|
| Restricted | 禁止所有脚本 | ❌ |
| AllSigned | 只运行签名脚本 | ⚠️ |
| RemoteSigned | 本地脚本可运行，远程需签名 | ✅ |
| Unrestricted | 所有脚本可运行 | ⚠️ |

推荐使用 `RemoteSigned`：

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🚀 快速启动脚本

创建 `start.ps1`：

```powershell
#!/usr/bin/env pwsh
# Android Trans Tool Plus 启动脚本

Write-Host "🚀 启动 Android Trans Tool Plus..." -ForegroundColor Cyan

# 检查 just
if (-not (Get-Command just -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未安装 just，请先安装：scoop install just" -ForegroundColor Red
    exit 1
}

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    just install
}

# 启动开发服务器
just dev
```

使用：

```powershell
.\start.ps1
```

## 🎓 学习资源

- [PowerShell 文档](https://docs.microsoft.com/powershell/)
- [Just 文档](https://just.systems/)
- [Windows Terminal 文档](https://docs.microsoft.com/windows-terminal/)

---

**提示**: 遇到问题？运行 `just help` 查看所有可用命令！
