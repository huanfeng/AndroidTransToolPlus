# 语言方案管理设计文档

> 日期：2026-03-18
> 状态：已确认（经审查修订）

## 1. 背景与目标

当前项目的翻译语言列表固定存储在 localStorage 中，不同项目需要的翻译语言不同，切换项目时需要手动调整语言列表，效率低下。

**目标**：
1. 支持多套语言方案（Preset），快速切换，支持导入导出
2. 支持从项目目录读取 `.trans-tool.json` 配置文件，不同项目独立配置
3. 两个功能互补，优先级：项目配置文件 > 当前选中方案 > 默认方案

## 2. 数据模型

### 2.1 语言标识体系说明

系统中存在两套语言标识：
- **内部 code**：如 `cn`, `cnHk`, `ja`，用于应用内部数据存储和逻辑
- **Android code**：如 `zh-rCN`, `zh-rHK`, `ja`，是 Android 标准语言代码

**规则**：
- `LanguagePreset`（localStorage 存储）使用**内部 code**，与现有 `enabledLanguages` 保持一致
- `.trans-tool.json`（项目配置文件）使用**内部 code**，因为该文件是本工具专用配置，内部 code 更简洁；文件中有 `name` 字段辅助理解
- 导入导出文件与 `.trans-tool.json` 格式一致

### 2.2 语言方案（LanguagePreset）

```typescript
interface LanguagePreset {
  id: string                      // 唯一标识（UUID）
  name: string                    // 方案名称
  enabledLanguages: Language[]    // 启用的语言列表（内部 code）
  createdAt: number               // 创建时间戳（ms）
  updatedAt: number               // 最后修改时间戳（ms）
}
```

### 2.3 项目配置文件（`.trans-tool.json`）

文件位于项目根目录下，格式：

```json
{
  "version": 1,
  "name": "项目A的翻译配置",
  "enabledLanguages": ["def", "cn", "ja", "ko", "ar"]
}
```

- `version`：配置文件版本号，当前为 `1`，用于未来格式升级时的兼容迁移
- 导出的方案文件与此格式一致，实现互通
- 导出文件包含方案名称，便于多方案区分

### 2.4 配置存储扩展

`AppConfig` 新增字段：

```typescript
interface AppConfig {
  // ... 现有字段 ...
  presets: LanguagePreset[]       // 所有方案列表
  activePresetId: string | null   // 当前激活方案 ID
  // activePresetId 为 '__project__' 表示使用项目配置
  // activePresetId 为 null 时使用默认方案（即 AppConfig.enabledLanguages）
}
```

方案数量上限：最多 **50** 个，防止 localStorage 膨胀。超出时提示用户删除旧方案。

### 2.5 项目配置运行时状态

项目配置不存入 localStorage，仅在内存中维护：

```typescript
interface ProjectConfig {
  name: string
  enabledLanguages: Language[]
  dirHandle: FileSystemDirectoryHandle  // 项目目录句柄，用于读写配置文件
  dirty: boolean                         // 是否有未保存的修改
}
```

> **注意**：浏览器 File System Access API 无法获取完整文件路径，因此使用 `dirHandle` 持有目录句柄。写回配置文件时通过 `dirHandle.getFileHandle('.trans-tool.json', { create: true })` 获取文件句柄。

**`dirty` 标记规则**：
- 设为 `true`：用户在项目配置模式下修改了语言列表（添加/删除/排序）
- 设为 `false`：用户点击"保存到项目配置"成功写回文件后
- 切换方案时若 `dirty` 为 `true`：弹出确认对话框，询问是否保存修改

## 3. 优先级逻辑

### 3.1 加载流程

1. 应用启动，从 localStorage 加载 `AppConfig`（包含 presets 和 activePresetId）
2. 打开项目目录时，检测根目录下是否存在 `.trans-tool.json`
   - **存在**：解析文件，加载为项目配置，自动将 `activePresetId` 设为 `'__project__'`
   - **不存在**：保持当前选中的方案
3. 应用 `enabledLanguages` 的来源根据 `activePresetId` 决定：
   - `'__project__'`：使用项目配置的语言列表（**不写入 localStorage**）
   - 某个方案 ID：使用该方案的语言列表，同步到 `configStore.config.enabledLanguages`
   - `null`：使用 `AppConfig.enabledLanguages`（默认方案）

### 3.2 数据隔离

为避免项目配置数据污染 localStorage：

- 引入计算属性 `effectiveEnabledLanguages`，根据 `activePresetId` 动态返回当前应使用的语言列表
- 当 `activePresetId === '__project__'` 时，`effectiveEnabledLanguages` 从内存中的 `ProjectConfig` 读取，**不修改** `configStore.config.enabledLanguages`
- 当切换到非项目方案时，将方案的 `enabledLanguages` 写入 `configStore.config.enabledLanguages`
- 翻译等业务逻辑统一使用 `effectiveEnabledLanguages`，不直接读取 `config.enabledLanguages`

### 3.3 手动切换

即使加载了项目配置，用户也可以通过下拉框切换到其他方案，此时 `activePresetId` 更新为选中的方案 ID，`effectiveEnabledLanguages` 随之更新。

## 4. 未知语言处理

加载方案或项目配置时，校验 `enabledLanguages` 中的每个语言 code：

1. 检查是否存在于内置语言列表（`BUILTIN_LANGUAGES`）
2. 检查是否存在于自定义语言列表（`LanguageManager`）
3. 如果存在未识别的语言：
   - 弹出提示对话框，列出未识别的语言 code
   - 引导用户为每个未识别的语言添加自定义语言配置（androidCode、nameCn、nameEn）
   - 未识别且未配置的语言暂时跳过，不加入启用列表

**校验规则**：
- `enabledLanguages` 必须为非空字符串数组
- 自动去重，保留首次出现的顺序
- 空数组视为有效（表示"无启用语言"）

## 5. UI 交互设计

### 5.1 主界面工具栏

在现有工具栏区域增加方案快速切换下拉框：

- 下拉框选项：
  - `📁 项目配置`（仅当检测到 `.trans-tool.json` 时显示，带特殊图标/样式）
  - 用户自定义的方案列表
  - `默认方案`（兜底选项）
- 切换即生效，立即更新 `effectiveEnabledLanguages`

### 5.2 设置对话框 Language 标签页

在现有语言管理区域上方，新增方案管理区域：

#### 方案选择与管理

- **下拉框**：选择当前方案
  - 项目配置选项带明显的视觉区分（不同背景色或图标标记）
  - 普通方案正常显示
- **操作按钮**：
  - ➕ 新建方案：基于当前启用的语言列表创建新方案，输入名称（校验同名）
  - ✏️ 重命名：修改方案名称（校验同名）
  - 🗑️ 删除：删除选中方案（默认方案不可删除，项目配置不可删除只能切换）
  - 📤 导出：将选中方案导出为 JSON 文件
  - 📥 导入：选择 JSON 文件，解析后添加为新方案

#### 项目配置的编辑与保存

项目配置作为特殊方案统一在方案列表中管理：

- 在方案下拉框中以不同视觉样式显示（如图标 📁 + 不同背景色）
- 选中项目配置方案后，编辑语言列表的操作与普通方案一致
- **保存按钮**：当选中项目配置时，保存按钮文案变为"保存到项目配置"，使用 warning 色调按钮样式，提醒用户修改的是项目文件
- 保存时将修改写回 `.trans-tool.json` 文件
- 如果有未保存修改（`dirty === true`），按钮旁显示未保存标记

#### 新建项目配置

- 如果当前项目目录下没有 `.trans-tool.json`，提供"创建项目配置"按钮
- 点击后基于当前启用的语言列表，在项目根目录下创建配置文件

#### 语言列表区域

保持现有交互不变：
- 已启用语言列表（支持拖拽排序）
- 快速按钮：添加默认、添加全部、清空
- 可启用语言标签
- 自定义语言管理表格

### 5.3 状态指示

- 主界面方案下拉框持续显示当前使用的方案来源
- 打开项目目录并加载项目配置时，显示 toast 提示"已加载项目配置"
- 切换方案时，若项目配置有未保存修改，弹出确认对话框

## 6. 导入导出

### 6.1 导出

- 将选中方案序列化为 JSON 文件（包含 `version`、`name`、`enabledLanguages`）
- 文件格式与 `.trans-tool.json` 一致
- 文件名建议为方案名称，如 `项目A翻译方案.json`
- 通过浏览器下载 API 触发下载

### 6.2 导入

- 选择 JSON 文件，解析内容
- 校验格式：
  - 必须包含 `enabledLanguages` 字段且为字符串数组
  - 数组元素不能为空字符串
  - 自动去重
- 如果文件包含 `name` 字段，使用该名称；否则使用文件名（去除扩展名）
- 如有同名方案，自动追加数字后缀（如"方案A (2)"）
- 校验语言列表，未识别的语言触发未知语言处理流程（见第 4 节）
- 添加为新方案

### 6.3 与项目配置的互通

- 导出的方案文件可以直接放到项目目录下改名为 `.trans-tool.json` 作为项目配置使用
- 项目的 `.trans-tool.json` 也可以通过导入功能添加为本地方案

## 7. 文件读写

### 7.1 读取项目配置

- **触发时机**：在 `projectStore.scanProject()` 完成后，由 preset store 监听 `projectStore.projectInfo` 变化来触发检测
- **读取方式**：通过 `projectStore` 持有的 `dirHandle` 调用 `dirHandle.getFileHandle('.trans-tool.json')` 尝试读取
  - 文件存在：解析 JSON，加载为 `ProjectConfig`
  - 文件不存在（`NotFoundError`）：不显示项目配置选项
  - 解析失败：显示 toast 错误提示，不影响正常使用

### 7.2 写入项目配置

- 在设置页面编辑项目配置方案后，点击"保存到项目配置"按钮时写回文件
- 通过 `dirHandle.getFileHandle('.trans-tool.json', { create: true })` 获取文件句柄
- 写入前进行 JSON 格式化（2 空格缩进，便于人工阅读和版本控制）

## 8. 与现有系统的集成

### 8.1 preset store 与 config store 的关系

- 新建 `src/stores/preset.ts` 作为方案管理的核心 store
- preset store 依赖 config store（读写 `presets`、`activePresetId`）
- preset store 对外暴露 `effectiveEnabledLanguages` 计算属性
- 现有业务逻辑（翻译、语言选择器等）改为从 preset store 读取 `effectiveEnabledLanguages`

### 8.2 与 project store 的集成

- `src/stores/project.ts` 需要在 `ProjectInfo` 中新增 `dirHandle: FileSystemDirectoryHandle` 字段（保留目录句柄引用）
- preset store 通过 `watch` 监听 `projectStore.projectInfo` 变化，检测并加载项目配置
- 无需修改 `scanProject()` 的核心扫描逻辑

### 8.3 config store 的 deep watch

现有 `config.ts` 有 deep watch 自动保存机制。新增的 `presets` 和 `activePresetId` 字段变更会自动触发保存，这是预期行为，无需额外处理。

## 9. 涉及的文件变更

### 新增文件
- `src/models/preset.ts` — 方案数据模型、校验逻辑、文件格式定义
- `src/stores/preset.ts` — 方案管理 store（CRUD、导入导出、项目配置读写、effectiveEnabledLanguages）
- `src/components/settings/PresetManager.vue` — 方案管理 UI 组件（设置对话框内）
- `src/components/common/PresetSelector.vue` — 主界面方案快速切换下拉框

### 修改文件
- `src/stores/config.ts` — AppConfig 新增 `presets`、`activePresetId` 字段及默认值
- `src/stores/project.ts` — ProjectInfo 新增 `dirHandle` 字段
- `src/models/language.ts` — 导出语言 code 校验辅助函数（`isKnownLanguageCode()`）
- `src/components/settings/SettingsDialog.vue` — 集成 PresetManager 组件
- `src/components/layout/` — 主界面集成 PresetSelector 组件
- `src/components/common/LanguageSelector.vue` — 改为使用 `effectiveEnabledLanguages`
- `src/stores/translation.ts` — 改为使用 `effectiveEnabledLanguages`
- `src/locales/zh-CN.ts` / `src/locales/en.ts` — 新增国际化文案
