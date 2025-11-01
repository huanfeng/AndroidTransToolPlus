# Android Trans Tool Plus - Just 命令配置
# 使用 just 运行常用的开发任务
# 安装 just: https://github.com/casey/just

# Windows 兼容配置：使用 PowerShell
set shell := ["powershell.exe", "-NoLogo", "-Command"]

# 设置默认命令
default:
  @just --list

# ========================================
# 安装和初始化
# ========================================

# 安装所有依赖
install:
  @Write-Host "📦 安装项目依赖..." -ForegroundColor Cyan
  pnpm install

# 安装 Tauri CLI（如果需要桌面版）
install-tauri:
  @Write-Host "🦀 安装 Tauri CLI..." -ForegroundColor Cyan
  pnpm add -D @tauri-apps/cli

# 完整初始化项目（首次使用）
init: install
  @Write-Host ""
  @Write-Host "✅ 项目初始化完成！" -ForegroundColor Green
  @Write-Host ""
  @Write-Host "💡 提示：" -ForegroundColor Yellow
  @Write-Host "  - 运行 'just dev' 启动 Web 开发服务器"
  @Write-Host "  - 运行 'just tauri-dev' 启动 Tauri 桌面版"
  @Write-Host "  - 运行 'just build' 构建生产版本"

# ========================================
# 开发服务器
# ========================================

# 启动 Web 开发服务器
dev:
  @Write-Host "🚀 启动 Web 开发服务器..." -ForegroundColor Cyan
  pnpm dev

# 启动 Tauri 开发模式（桌面应用）
tauri-dev:
  @Write-Host "🦀 启动 Tauri 开发模式..." -ForegroundColor Cyan
  pnpm tauri dev

# 启动 Web 开发服务器并自动打开浏览器
dev-open:
  @Write-Host "🚀 启动 Web 开发服务器并打开浏览器..." -ForegroundColor Cyan
  pnpm dev --open

# 启动开发服务器（指定端口）
dev-port PORT:
  @Write-Host "🚀 启动 Web 开发服务器（端口: {{PORT}}）..." -ForegroundColor Cyan
  pnpm dev --port {{PORT}}

# ========================================
# 构建
# ========================================

# 构建 Web 生产版本
build:
  @Write-Host "🔨 构建 Web 生产版本..." -ForegroundColor Cyan
  pnpm build
  @Write-Host "✅ 构建完成！输出目录: dist/" -ForegroundColor Green

# 构建 Tauri 桌面应用
tauri-build:
  @Write-Host "🦀 构建 Tauri 桌面应用..." -ForegroundColor Cyan
  pnpm tauri build
  @Write-Host "✅ 构建完成！" -ForegroundColor Green

# 预览生产构建
preview: build
  @Write-Host "👀 预览生产构建..." -ForegroundColor Cyan
  pnpm preview

# 构建并预览
build-preview: build preview

# ========================================
# 代码质量
# ========================================

# 类型检查
typecheck:
  @Write-Host "🔍 运行 TypeScript 类型检查..." -ForegroundColor Cyan
  npx vue-tsc --noEmit

# 格式化代码（使用 Prettier）
format:
  @Write-Host "✨ 格式化代码..." -ForegroundColor Cyan
  npx prettier --write "src/**/*.{ts,vue,js,json,css,scss}"

# 检查代码格式
format-check:
  @Write-Host "🔍 检查代码格式..." -ForegroundColor Cyan
  npx prettier --check "src/**/*.{ts,vue,js,json,css,scss}"

# Lint 检查
lint:
  @Write-Host "🔍 运行 ESLint 检查..." -ForegroundColor Cyan
  npx eslint "src/**/*.{ts,vue,js}"

# 修复 Lint 问题
lint-fix:
  @Write-Host "🔧 修复 ESLint 问题..." -ForegroundColor Cyan
  npx eslint "src/**/*.{ts,vue,js}" --fix

# 运行所有检查
check: typecheck format-check
  @Write-Host "✅ 所有检查通过！" -ForegroundColor Green

# ========================================
# 清理
# ========================================

# 清理构建产物
clean:
  @Write-Host "🧹 清理构建产物..." -ForegroundColor Cyan
  @if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
  @if (Test-Path "dist-ssr") { Remove-Item -Recurse -Force "dist-ssr" }
  @Write-Host "✅ 清理完成！" -ForegroundColor Green

# 清理 node_modules
clean-deps:
  @Write-Host "🧹 清理依赖..." -ForegroundColor Cyan
  @if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
  @if (Test-Path "pnpm-lock.yaml") { Remove-Item -Force "pnpm-lock.yaml" }
  @Write-Host "✅ 依赖已清理！" -ForegroundColor Green

# 清理 Tauri 构建产物
clean-tauri:
  @Write-Host "🧹 清理 Tauri 构建产物..." -ForegroundColor Cyan
  @if (Test-Path "src-tauri\\target") { Remove-Item -Recurse -Force "src-tauri\\target" }
  @Write-Host "✅ Tauri 构建产物已清理！" -ForegroundColor Green

# 深度清理（所有构建产物和依赖）
clean-all: clean clean-deps clean-tauri
  @Write-Host "✅ 深度清理完成！" -ForegroundColor Green

# 清理并重新安装
reset: clean-all install
  @Write-Host "✅ 项目已重置！" -ForegroundColor Green

# ========================================
# 测试（待实现）
# ========================================

# 运行单元测试
test:
  @Write-Host "🧪 运行单元测试..." -ForegroundColor Cyan
  @Write-Host "⚠️  测试功能尚未实现" -ForegroundColor Yellow
  # npm run test

# 运行测试并生成覆盖率报告
test-coverage:
  @Write-Host "🧪 运行测试并生成覆盖率..." -ForegroundColor Cyan
  @Write-Host "⚠️  测试功能尚未实现" -ForegroundColor Yellow
  # npm run test:coverage

# 监听模式运行测试
test-watch:
  @Write-Host "🧪 监听模式运行测试..." -ForegroundColor Cyan
  @Write-Host "⚠️  测试功能尚未实现" -ForegroundColor Yellow
  # npm run test:watch

# ========================================
# 文档
# ========================================

# 查看产品需求文档
doc-prd:
  @Write-Host "📖 打开产品需求文档..." -ForegroundColor Cyan
  @if (Get-Command code -ErrorAction SilentlyContinue) { code docs\\PRD.md } else { Get-Content docs\\PRD.md }

# 查看技术架构文档
doc-arch:
  @Write-Host "📖 打开技术架构文档..." -ForegroundColor Cyan
  @if (Get-Command code -ErrorAction SilentlyContinue) { code docs\\ARCHITECTURE.md } else { Get-Content docs\\ARCHITECTURE.md }

# 查看所有文档
docs:
  @Write-Host "📚 可用文档：" -ForegroundColor Cyan
  @Write-Host "  - README.md                项目说明"
  @Write-Host "  - docs\\PRD.md              产品需求文档"
  @Write-Host "  - docs\\ARCHITECTURE.md     技术架构文档"
  @Write-Host ""
  @Write-Host "💡 使用 'just doc-prd' 或 'just doc-arch' 打开文档" -ForegroundColor Yellow

# ========================================
# 依赖管理
# ========================================

# 查看过时的依赖
outdated:
  @Write-Host "🔍 检查过时的依赖..." -ForegroundColor Cyan
  pnpm outdated

# 更新依赖（交互式）
update:
  @Write-Host "⬆️  更新依赖..." -ForegroundColor Cyan
  pnpm update

# 更新依赖到最新版本（交互式）
update-latest:
  @Write-Host "⬆️  更新依赖到最新版本..." -ForegroundColor Cyan
  pnpm update --latest --interactive

# 审计依赖安全性
audit:
  @Write-Host "🔒 审计依赖安全性..." -ForegroundColor Cyan
  pnpm audit

# 修复依赖安全问题
audit-fix:
  @Write-Host "🔧 修复依赖安全问题..." -ForegroundColor Cyan
  pnpm audit --fix

# 添加依赖
add PACKAGE:
  @Write-Host "➕ 添加依赖: {{PACKAGE}}" -ForegroundColor Cyan
  pnpm add {{PACKAGE}}

# 添加开发依赖
add-dev PACKAGE:
  @Write-Host "➕ 添加开发依赖: {{PACKAGE}}" -ForegroundColor Cyan
  pnpm add -D {{PACKAGE}}

# 移除依赖
remove PACKAGE:
  @Write-Host "➖ 移除依赖: {{PACKAGE}}" -ForegroundColor Cyan
  pnpm remove {{PACKAGE}}

# 清理未使用的依赖（pnpm 特有）
prune:
  @Write-Host "🧹 清理未使用的依赖..." -ForegroundColor Cyan
  pnpm prune

# 查看依赖树
list-tree:
  @Write-Host "🌳 查看依赖树..." -ForegroundColor Cyan
  pnpm list --depth=3

# ========================================
# Git 相关
# ========================================

# 查看项目状态
status:
  @Write-Host "📊 项目状态：" -ForegroundColor Cyan
  @git status -sb
  @Write-Host ""
  @Write-Host "📝 未提交的文件：" -ForegroundColor Cyan
  @git status --short

# 快速提交（需要提供消息）
commit MESSAGE:
  @Write-Host "💾 提交更改: {{MESSAGE}}" -ForegroundColor Cyan
  git add .
  git commit -m "{{MESSAGE}}"

# 提交并推送
push MESSAGE: (commit MESSAGE)
  @Write-Host "⬆️  推送到远程仓库..." -ForegroundColor Cyan
  git push

# ========================================
# Tauri 专用命令
# ========================================

# 初始化 Tauri 项目
tauri-init:
  @Write-Host "🦀 初始化 Tauri 项目..." -ForegroundColor Cyan
  pnpm tauri init

# 查看 Tauri 信息
tauri-info:
  @Write-Host "ℹ️  Tauri 项目信息：" -ForegroundColor Cyan
  pnpm tauri info

# 添加 Tauri 图标
tauri-icon ICON_PATH:
  @Write-Host "🎨 生成 Tauri 图标..." -ForegroundColor Cyan
  pnpm tauri icon "{{ICON_PATH}}"

# ========================================
# 开发工具
# ========================================

# 分析构建包大小
analyze:
  @Write-Host "📊 分析构建包大小..." -ForegroundColor Cyan
  pnpm build --mode=analyze

# 查看项目信息
info:
  @Write-Host "ℹ️  项目信息：" -ForegroundColor Cyan
  @Write-Host "  名称: android-trans-tool-plus"
  @Write-Host "  版本: 1.0.0"
  @Write-Host ""
  @Write-Host "📦 依赖信息：" -ForegroundColor Cyan
  @pnpm list --depth=0
  @Write-Host ""
  @Write-Host "🌍 环境信息：" -ForegroundColor Cyan
  @$nodeVer = node --version; Write-Host "  Node: $nodeVer"
  @$pnpmVer = pnpm --version; Write-Host "  pnpm: $pnpmVer"

# 生成项目统计
stats:
  @Write-Host "📊 项目统计：" -ForegroundColor Cyan
  @Write-Host ""
  @Write-Host "📁 文件数量：" -ForegroundColor Yellow
  @$fileCount = (Get-ChildItem -Path src -File -Recurse).Count; Write-Host "  源文件: $fileCount"
  @Write-Host ""
  @Write-Host "📝 代码行数：" -ForegroundColor Yellow
  @$tsFiles = Get-ChildItem -Path src -Include *.ts,*.vue -Recurse -File
  @$lineCount = ($tsFiles | Get-Content | Measure-Object -Line).Lines
  @Write-Host "  TypeScript/Vue: $lineCount 行"
  @Write-Host ""
  @Write-Host "📦 依赖数量：" -ForegroundColor Yellow
  @$depCount = (pnpm list --depth=0 2>$null | Select-String "├─|└─").Count
  @Write-Host "  依赖包: $depCount"

# ========================================
# 快捷命令组合
# ========================================

# 完整的开发工作流：清理 -> 安装 -> 启动
fresh: clean-all install
  @Write-Host "🚀 开始开发..." -ForegroundColor Cyan
  @just dev

# 发布前检查：类型检查 -> 格式检查 -> 构建
pre-release: check build
  @Write-Host "✅ 发布前检查完成！" -ForegroundColor Green

# 快速重启开发服务器
restart:
  @Write-Host "🔄 重启开发服务器..." -ForegroundColor Cyan
  @Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*vite*"} | Stop-Process -Force -ErrorAction SilentlyContinue
  @Start-Sleep -Seconds 1
  @just dev

# ========================================
# 帮助信息
# ========================================

# 显示详细帮助
help:
  @Write-Host "🚀 Android Trans Tool Plus - 命令帮助" -ForegroundColor Cyan
  @Write-Host ""
  @Write-Host "📦 安装和初始化：" -ForegroundColor Yellow
  @Write-Host "  just install        安装项目依赖"
  @Write-Host "  just install-tauri  安装 Tauri CLI"
  @Write-Host "  just init           完整初始化项目"
  @Write-Host ""
  @Write-Host "🚀 开发：" -ForegroundColor Yellow
  @Write-Host "  just dev            启动 Web 开发服务器"
  @Write-Host "  just tauri-dev      启动 Tauri 桌面版"
  @Write-Host "  just dev-open       启动并打开浏览器"
  @Write-Host ""
  @Write-Host "🔨 构建：" -ForegroundColor Yellow
  @Write-Host "  just build          构建 Web 生产版本"
  @Write-Host "  just tauri-build    构建 Tauri 桌面应用"
  @Write-Host "  just preview        预览生产构建"
  @Write-Host ""
  @Write-Host "🔍 代码质量：" -ForegroundColor Yellow
  @Write-Host "  just typecheck      TypeScript 类型检查"
  @Write-Host "  just format         格式化代码"
  @Write-Host "  just lint           Lint 检查"
  @Write-Host "  just check          运行所有检查"
  @Write-Host ""
  @Write-Host "🧹 清理：" -ForegroundColor Yellow
  @Write-Host "  just clean          清理构建产物"
  @Write-Host "  just clean-all      深度清理"
  @Write-Host "  just reset          清理并重新安装"
  @Write-Host ""
  @Write-Host "📚 文档：" -ForegroundColor Yellow
  @Write-Host "  just docs           查看所有文档"
  @Write-Host "  just doc-prd        查看需求文档"
  @Write-Host "  just doc-arch       查看架构文档"
  @Write-Host ""
  @Write-Host "🔧 实用工具：" -ForegroundColor Yellow
  @Write-Host "  just info           查看项目信息"
  @Write-Host "  just stats          查看项目统计"
  @Write-Host "  just outdated       检查过时的依赖"
  @Write-Host ""
  @Write-Host "📦 依赖管理 (pnpm)：" -ForegroundColor Yellow
  @Write-Host "  just add <pkg>      添加依赖"
  @Write-Host "  just add-dev <pkg>  添加开发依赖"
  @Write-Host "  just remove <pkg>   移除依赖"
  @Write-Host "  just update-latest  交互式更新到最新版本"
  @Write-Host "  just prune          清理未使用的依赖"
  @Write-Host "  just list-tree      查看依赖树"
  @Write-Host ""
  @Write-Host "💡 运行 'just --list' 查看所有可用命令" -ForegroundColor Green
