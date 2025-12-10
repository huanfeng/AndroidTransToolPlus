# Repository Guidelines

## 项目结构与模块组织
- 前端代码在 `src/`：`components/` UI 组件、`stores/` 状态管理、`services/` 业务逻辑、`adapters/` 平台适配、`utils/` 与 `types/` 为通用工具与类型。
- 入口文件为 `src/main.ts`，全局样式在 `src/styles/`，静态资源放入 `public/`。
- 文档集中于 `docs/`（架构、语言系统、格式化指南等）；示例与单元测试位于 `tests/`，产物输出到 `dist/`。

## 构建、开发与调试命令
- 安装依赖：`pnpm install`（Node 18+/pnpm 8+）。
- 本地开发：`pnpm dev`，默认 http://localhost:5173。
- 生产构建：`pnpm build`；预览产物：`pnpm preview`。
- 测试：`pnpm test` 交互运行，`pnpm test:run` 静默运行，`pnpm test:coverage` 生成覆盖率。
- 代码检查/格式化：`pnpm format` 自动格式化，`pnpm format:check` 只检测；清理缓存/产物：`pnpm clean`、`pnpm clean:all`。

## 代码风格与命名约定
- 统一使用 TypeScript + Vue 3 组合式 API，模块别名使用 `@/`。
- Prettier 规则：2 空格缩进、单引号、无分号、行宽 100、ES5 尾逗号、`arrowParens: avoid`、`LF` 换行。
- ESLint 基于 `eslint:recommended`、`plugin:vue/vue3-recommended`、`@typescript-eslint/recommended`，`no-console`/`no-debugger` 在生产仅警告，未用参数请用前缀 `_`。
- 组件、store、service 按职责命名；测试文件使用 `*.test.ts`，与被测模块同名。

## 测试规范
- 测试框架为 Vitest（`happy-dom` 环境，`tests/setup.ts` 统一 Mock）。推荐使用 `@testing-library/vue` + `@vue/test-utils` 做组件/交互测试。
- 覆盖率由 V8 收集（text/json/html 报告），新增功能需补充关键路径测试并保持覆盖率不下降。
- 结构建议：在 `tests/models|services|utils/` 对应目录编写同名测试，尽量使用真实数据或最小必要的 Mock，验证错误路径和边界值。

## 提交与 Pull Request
- 提交遵循 Conventional Commits（示例：`feat: 新增自定义语言管理`，`fix(resource): 修复重复渲染`），信息使用简洁中文/英文均可。
- 提交前务必运行 `pnpm format`、`pnpm test`/`pnpm test:run`，确保无 lint/测试错误。
- PR 应包含：变更摘要、关联 Issue、风险/兼容性说明，UI 改动附截图/录屏，必要时同步更新文档（`README.md`、`docs/*`）。
- 避免将实际密钥、`.env` 或用户数据加入版本库，保留必要的配置示例即可。

## 配置与安全提示
- 应用的 OpenAI API 配置存储在浏览器本地，不要将真实 Key 写入仓库或示例文件。
- Android 项目级配置可在目标项目根目录提供 `android_trans.json`（如指定 `resDirs`、`excludeFiles`）；注意忽略私有或敏感资源。
- 对外分享前清理 `dist/`、临时缓存与个人调试脚本，保持仓库可复现、可安装。
