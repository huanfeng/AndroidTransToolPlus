# Android Trans Tool Plus - Just 命令配置
# 使用 just 运行常用的开发任务
# 安装 just: https://github.com/casey/just

# 设置默认命令
default:
  @just --list

# ========================================
# 安装和初始化
# ========================================

# 安装所有依赖
install:
  @echo "📦 安装项目依赖..."
  npm install

# 安装 Tauri CLI（如果需要桌面版）
install-tauri:
  @echo "🦀 安装 Tauri CLI..."
  npm install --save-dev @tauri-apps/cli

# 完整初始化项目（首次使用）
init: install
  @echo "✅ 项目初始化完成！"
  @echo ""
  @echo "💡 提示："
  @echo "  - 运行 'just dev' 启动 Web 开发服务器"
  @echo "  - 运行 'just tauri-dev' 启动 Tauri 桌面版"
  @echo "  - 运行 'just build' 构建生产版本"

# ========================================
# 开发服务器
# ========================================

# 启动 Web 开发服务器
dev:
  @echo "🚀 启动 Web 开发服务器..."
  npm run dev

# 启动 Tauri 开发模式（桌面应用）
tauri-dev:
  @echo "🦀 启动 Tauri 开发模式..."
  npm run tauri dev

# 启动 Web 开发服务器并自动打开浏览器
dev-open:
  @echo "🚀 启动 Web 开发服务器并打开浏览器..."
  npm run dev -- --open

# 启动开发服务器（指定端口）
dev-port PORT:
  @echo "🚀 启动 Web 开发服务器（端口: {{PORT}}）..."
  npm run dev -- --port {{PORT}}

# ========================================
# 构建
# ========================================

# 构建 Web 生产版本
build:
  @echo "🔨 构建 Web 生产版本..."
  npm run build
  @echo "✅ 构建完成！输出目录: dist/"

# 构建 Tauri 桌面应用
tauri-build:
  @echo "🦀 构建 Tauri 桌面应用..."
  npm run tauri build
  @echo "✅ 构建完成！"

# 预览生产构建
preview: build
  @echo "👀 预览生产构建..."
  npm run preview

# 构建并预览
build-preview: build preview

# ========================================
# 代码质量
# ========================================

# 类型检查
typecheck:
  @echo "🔍 运行 TypeScript 类型检查..."
  npx vue-tsc --noEmit

# 格式化代码（使用 Prettier）
format:
  @echo "✨ 格式化代码..."
  npx prettier --write "src/**/*.{ts,vue,js,json,css,scss}"

# 检查代码格式
format-check:
  @echo "🔍 检查代码格式..."
  npx prettier --check "src/**/*.{ts,vue,js,json,css,scss}"

# Lint 检查（需要先安装 ESLint）
lint:
  @echo "🔍 运行 ESLint 检查..."
  npx eslint "src/**/*.{ts,vue,js}"

# 修复 Lint 问题
lint-fix:
  @echo "🔧 修复 ESLint 问题..."
  npx eslint "src/**/*.{ts,vue,js}" --fix

# 运行所有检查
check: typecheck format-check
  @echo "✅ 所有检查通过！"

# ========================================
# 清理
# ========================================

# 清理构建产物
clean:
  @echo "🧹 清理构建产物..."
  rm -rf dist
  rm -rf dist-ssr
  @echo "✅ 清理完成！"

# 清理 node_modules
clean-deps:
  @echo "🧹 清理依赖..."
  rm -rf node_modules
  @echo "✅ 依赖已清理！"

# 清理 Tauri 构建产物
clean-tauri:
  @echo "🧹 清理 Tauri 构建产物..."
  rm -rf src-tauri/target
  @echo "✅ Tauri 构建产物已清理！"

# 深度清理（所有构建产物和依赖）
clean-all: clean clean-deps clean-tauri
  @echo "✅ 深度清理完成！"

# 清理并重新安装
reset: clean-all install
  @echo "✅ 项目已重置！"

# ========================================
# 测试（待实现）
# ========================================

# 运行单元测试
test:
  @echo "🧪 运行单元测试..."
  @echo "⚠️  测试功能尚未实现"
  # npm run test

# 运行测试并生成覆盖率报告
test-coverage:
  @echo "🧪 运行测试并生成覆盖率..."
  @echo "⚠️  测试功能尚未实现"
  # npm run test:coverage

# 监听模式运行测试
test-watch:
  @echo "🧪 监听模式运行测试..."
  @echo "⚠️  测试功能尚未实现"
  # npm run test:watch

# ========================================
# 文档
# ========================================

# 查看产品需求文档
doc-prd:
  @echo "📖 打开产品需求文档..."
  @if command -v code > /dev/null 2>&1; then \
    code docs/PRD.md; \
  else \
    cat docs/PRD.md; \
  fi

# 查看技术架构文档
doc-arch:
  @echo "📖 打开技术架构文档..."
  @if command -v code > /dev/null 2>&1; then \
    code docs/ARCHITECTURE.md; \
  else \
    cat docs/ARCHITECTURE.md; \
  fi

# 查看所有文档
docs:
  @echo "📚 可用文档："
  @echo "  - README.md          项目说明"
  @echo "  - docs/PRD.md        产品需求文档"
  @echo "  - docs/ARCHITECTURE.md  技术架构文档"
  @echo ""
  @echo "💡 使用 'just doc-prd' 或 'just doc-arch' 打开文档"

# ========================================
# 依赖管理
# ========================================

# 查看过时的依赖
outdated:
  @echo "🔍 检查过时的依赖..."
  npm outdated

# 更新依赖（交互式）
update:
  @echo "⬆️  更新依赖..."
  npm update

# 审计依赖安全性
audit:
  @echo "🔒 审计依赖安全性..."
  npm audit

# 修复依赖安全问题
audit-fix:
  @echo "🔧 修复依赖安全问题..."
  npm audit fix

# ========================================
# Git 相关
# ========================================

# 查看项目状态
status:
  @echo "📊 项目状态："
  @git status -sb
  @echo ""
  @echo "📝 未提交的文件："
  @git status --short

# 快速提交（需要提供消息）
commit MESSAGE:
  @echo "💾 提交更改: {{MESSAGE}}"
  git add .
  git commit -m "{{MESSAGE}}"

# 提交并推送
push MESSAGE: (commit MESSAGE)
  @echo "⬆️  推送到远程仓库..."
  git push

# ========================================
# Tauri 专用命令
# ========================================

# 初始化 Tauri 项目
tauri-init:
  @echo "🦀 初始化 Tauri 项目..."
  npm run tauri init

# 查看 Tauri 信息
tauri-info:
  @echo "ℹ️  Tauri 项目信息："
  npm run tauri info

# 添加 Tauri 图标
tauri-icon ICON_PATH:
  @echo "🎨 生成 Tauri 图标..."
  npm run tauri icon "{{ICON_PATH}}"

# ========================================
# 开发工具
# ========================================

# 分析构建包大小
analyze:
  @echo "📊 分析构建包大小..."
  npm run build -- --mode=analyze

# 查看项目信息
info:
  @echo "ℹ️  项目信息："
  @echo "  名称: android-trans-tool-plus"
  @echo "  版本: 1.0.0"
  @echo ""
  @echo "📦 依赖信息："
  @npm list --depth=0
  @echo ""
  @echo "🌍 环境信息："
  @echo "  Node: $(node --version)"
  @echo "  npm: $(npm --version)"

# 生成项目统计
stats:
  @echo "📊 项目统计："
  @echo ""
  @echo "📁 文件数量："
  @find src -type f | wc -l | xargs echo "  源文件:"
  @echo ""
  @echo "📝 代码行数："
  @find src -name "*.ts" -o -name "*.vue" | xargs wc -l | tail -1 | awk '{print "  TypeScript/Vue: " $1 " 行"}'
  @echo ""
  @echo "📦 依赖数量："
  @npm list --depth=0 | grep -c "├─\|└─" | xargs echo "  依赖包:"

# ========================================
# 快捷命令组合
# ========================================

# 完整的开发工作流：清理 -> 安装 -> 启动
fresh: clean-all install dev

# 发布前检查：类型检查 -> 格式检查 -> 构建
pre-release: check build
  @echo "✅ 发布前检查完成！"

# 快速重启开发服务器
restart:
  @echo "🔄 重启开发服务器..."
  @pkill -f "vite" || true
  @sleep 1
  @just dev

# ========================================
# 帮助信息
# ========================================

# 显示详细帮助
help:
  @echo "🚀 Android Trans Tool Plus - 命令帮助"
  @echo ""
  @echo "📦 安装和初始化："
  @echo "  just install        安装项目依赖"
  @echo "  just install-tauri  安装 Tauri CLI"
  @echo "  just init           完整初始化项目"
  @echo ""
  @echo "🚀 开发："
  @echo "  just dev            启动 Web 开发服务器"
  @echo "  just tauri-dev      启动 Tauri 桌面版"
  @echo "  just dev-open       启动并打开浏览器"
  @echo ""
  @echo "🔨 构建："
  @echo "  just build          构建 Web 生产版本"
  @echo "  just tauri-build    构建 Tauri 桌面应用"
  @echo "  just preview        预览生产构建"
  @echo ""
  @echo "🔍 代码质量："
  @echo "  just typecheck      TypeScript 类型检查"
  @echo "  just format         格式化代码"
  @echo "  just lint           Lint 检查"
  @echo "  just check          运行所有检查"
  @echo ""
  @echo "🧹 清理："
  @echo "  just clean          清理构建产物"
  @echo "  just clean-all      深度清理"
  @echo "  just reset          清理并重新安装"
  @echo ""
  @echo "📚 文档："
  @echo "  just docs           查看所有文档"
  @echo "  just doc-prd        查看需求文档"
  @echo "  just doc-arch       查看架构文档"
  @echo ""
  @echo "🔧 实用工具："
  @echo "  just info           查看项目信息"
  @echo "  just stats          查看项目统计"
  @echo "  just outdated       检查过时的依赖"
  @echo ""
  @echo "💡 运行 'just --list' 查看所有可用命令"
