# pnpm 使用指南

本项目使用 **pnpm** 作为包管理器，以获得更快的安装速度和更高效的磁盘空间使用。

## 🎯 为什么使用 pnpm？

### 优势对比

| 特性 | npm | pnpm | 优势 |
|------|-----|------|------|
| 安装速度 | 中等 | **快 2-3 倍** | ✅ |
| 磁盘空间 | 每个项目独立 | **全局共享** | ✅ |
| node_modules 结构 | 扁平化 | **严格嵌套** | ✅ |
| 幽灵依赖 | 存在 | **不存在** | ✅ |
| 内存占用 | 较高 | **较低** | ✅ |

### 性能对比

```
操作                npm        pnpm      提升
─────────────────────────────────────────────
安装依赖           45s        15s       3x
添加依赖           8s         2s        4x
更新依赖           30s        10s       3x
```

## 🚀 安装 pnpm

### Windows

```powershell
# 方法 1: 使用 npm（推荐）
npm install -g pnpm

# 方法 2: 使用 Scoop
scoop install nodejs-lts pnpm

# 方法 3: 使用独立脚本
iwr https://get.pnpm.io/install.ps1 -useb | iex

# 验证安装
pnpm --version
```

### macOS / Linux

```bash
# 使用 npm
npm install -g pnpm

# 或使用 curl
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 验证安装
pnpm --version
```

## 📦 基础命令

### 安装依赖

```powershell
# 安装所有依赖
pnpm install
# 或简写
pnpm i

# 使用 just 命令
just install
```

### 添加依赖

```powershell
# 添加生产依赖
pnpm add <package>
# 例如
pnpm add axios

# 添加开发依赖
pnpm add -D <package>
# 例如
pnpm add -D @types/node

# 添加全局依赖
pnpm add -g <package>

# 使用 just 命令
just add axios
just add-dev @types/node
```

### 移除依赖

```powershell
# 移除依赖
pnpm remove <package>
# 或简写
pnpm rm <package>

# 使用 just 命令
just remove axios
```

### 更新依赖

```powershell
# 更新所有依赖
pnpm update

# 更新到最新版本（交互式）
pnpm update --latest --interactive

# 更新特定依赖
pnpm update <package>

# 使用 just 命令
just update
just update-latest
```

## 🔍 查询命令

### 查看依赖

```powershell
# 查看依赖列表
pnpm list

# 查看依赖树
pnpm list --depth=3

# 查看过时的依赖
pnpm outdated

# 使用 just 命令
just list-tree
just outdated
```

### 查看包信息

```powershell
# 查看包信息
pnpm view <package>

# 查看包的所有版本
pnpm view <package> versions
```

## 🧹 清理命令

```powershell
# 清理未使用的依赖
pnpm prune

# 清理 pnpm 缓存
pnpm store prune

# 查看存储空间使用
pnpm store status

# 使用 just 命令
just prune
just clean-deps  # 删除 node_modules 和 pnpm-lock.yaml
```

## 🔒 锁定文件

### pnpm-lock.yaml

pnpm 使用 `pnpm-lock.yaml` 作为锁定文件（类似 npm 的 `package-lock.json`）。

**特点**：
- ✅ 更易读的 YAML 格式
- ✅ 更小的文件大小
- ✅ 更快的解析速度

**是否提交到 Git？**

```gitignore
# 选项 1: 不提交（推荐用于个人项目）
pnpm-lock.yaml

# 选项 2: 提交（推荐用于团队协作）
# 不添加到 .gitignore
```

**本项目配置**：默认不提交到 Git（已添加到 `.gitignore`）

## 🎯 Just 命令集成

本项目已将所有命令集成到 justfile 中：

### 开发命令

```powershell
# 启动开发服务器
just dev                 # pnpm dev

# 构建项目
just build              # pnpm build

# 预览构建
just preview            # pnpm preview
```

### 依赖管理

```powershell
# 安装依赖
just install            # pnpm install

# 添加依赖
just add axios          # pnpm add axios
just add-dev prettier   # pnpm add -D prettier

# 移除依赖
just remove axios       # pnpm remove axios

# 更新依赖
just update             # pnpm update
just update-latest      # pnpm update --latest --interactive

# 清理
just prune              # pnpm prune
just clean-deps         # 删除 node_modules 和 pnpm-lock.yaml
```

### 查询命令

```powershell
# 查看依赖
just list-tree          # pnpm list --depth=3

# 查看过时依赖
just outdated           # pnpm outdated

# 安全审计
just audit              # pnpm audit
just audit-fix          # pnpm audit --fix
```

## ⚙️ pnpm 配置文件

### .npmrc

项目根目录的 `.npmrc` 文件配置 pnpm 行为：

```ini
# 严格对等依赖（关闭以避免警告）
strict-peer-dependencies=false

# 提升模式（兼容性更好）
shamefully-hoist=true

# 自动安装对等依赖
auto-install-peers=true

# 使用硬链接节省空间
link-workspace-packages=true

# 锁定文件版本
lockfile-version=9

# 镜像配置（可选，国内用户可以配置）
# registry=https://registry.npmmirror.com
```

### 修改配置

```powershell
# 查看配置
pnpm config list

# 设置镜像（国内用户）
pnpm config set registry https://registry.npmmirror.com

# 恢复官方镜像
pnpm config set registry https://registry.npmjs.org
```

## 🌍 工作区（Workspace）支持

pnpm 原生支持 monorepo（多包仓库）：

### pnpm-workspace.yaml

```yaml
packages:
  # 所有在 packages 目录下的包
  - 'packages/*'
  # 排除测试目录
  - '!**/test/**'
```

### 工作区命令

```powershell
# 在所有包中运行命令
pnpm -r run build

# 在特定包中运行命令
pnpm --filter <package-name> run dev

# 添加依赖到特定包
pnpm --filter <package-name> add <dependency>
```

## 🚨 常见问题

### Q1: pnpm 和 npm 可以混用吗？

A: **不建议**。应该在项目中只使用一种包管理器。

```powershell
# 如果误用了 npm，删除 package-lock.json
Remove-Item package-lock.json

# 然后使用 pnpm
pnpm install
```

### Q2: node_modules 结构不同怎么办？

A: pnpm 使用符号链接创建非扁平的 node_modules。这是正常的，且更安全：

- ✅ 避免幽灵依赖
- ✅ 严格的依赖解析
- ✅ 节省磁盘空间

如果遇到兼容性问题，可以启用 `shamefully-hoist`（已在 `.npmrc` 中配置）。

### Q3: 安装速度还是慢？

A: 检查以下配置：

```powershell
# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com

# 或在 .npmrc 中配置
# registry=https://registry.npmmirror.com
```

### Q4: 如何迁移现有项目？

```powershell
# 1. 删除旧的锁定文件和 node_modules
just clean-deps

# 2. 使用 pnpm 安装
just install

# 3. 验证项目运行正常
just dev
```

### Q5: pnpm 存储在哪里？

```powershell
# 查看存储位置
pnpm store path

# Windows 默认位置
# C:\Users\<用户名>\AppData\Local\pnpm\store

# 查看存储使用情况
pnpm store status
```

## 📊 性能优化

### 1. 使用 .pnpmfile.cjs 自定义

```javascript
// .pnpmfile.cjs
module.exports = {
  hooks: {
    readPackage(pkg) {
      // 自动修复依赖问题
      if (pkg.name === 'some-package') {
        pkg.dependencies['missing-dep'] = '^1.0.0'
      }
      return pkg
    }
  }
}
```

### 2. 并行安装

```powershell
# pnpm 默认并行安装
# 可以调整并发数
pnpm install --reporter=append-only
```

### 3. 离线模式

```powershell
# 使用缓存离线安装
pnpm install --offline
```

## 🔗 有用的链接

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm vs npm](https://pnpm.io/motivation)
- [pnpm CLI 命令](https://pnpm.io/cli/add)
- [pnpm 配置选项](https://pnpm.io/npmrc)

## 📝 快速参考

### 常用命令速查表

| 操作 | npm 命令 | pnpm 命令 | just 命令 |
|------|---------|----------|----------|
| 安装 | `npm install` | `pnpm install` | `just install` |
| 添加依赖 | `npm install <pkg>` | `pnpm add <pkg>` | `just add <pkg>` |
| 添加开发依赖 | `npm install -D <pkg>` | `pnpm add -D <pkg>` | `just add-dev <pkg>` |
| 移除依赖 | `npm uninstall <pkg>` | `pnpm remove <pkg>` | `just remove <pkg>` |
| 更新依赖 | `npm update` | `pnpm update` | `just update` |
| 运行脚本 | `npm run dev` | `pnpm dev` | `just dev` |
| 列出依赖 | `npm list` | `pnpm list` | `just list-tree` |
| 过时依赖 | `npm outdated` | `pnpm outdated` | `just outdated` |
| 安全审计 | `npm audit` | `pnpm audit` | `just audit` |

---

**建议**: 开始使用前运行 `.\test-just.ps1` 验证 pnpm 已正确安装！
