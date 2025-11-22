# Android Trans Tool Plus - 产品需求文档 (PRD)

## 1. 项目概述

### 1.1 产品简介
Android Trans Tool Plus 是一个基于 Web 技术的 Android 应用国际化翻译工具，通过 OpenAI GPT 模型自动化翻译 Android 字符串资源文件。

### 1.2 产品定位
- **用户群体**：Android 开发者、本地化团队、独立开发者
- **核心价值**：自动化国际化流程，提高翻译效率和质量
- **产品形态**：
  - 纯前端 Web 应用（可部署到静态服务器）
  - Tauri 桌面应用（支持 Windows/macOS/Linux）

### 1.3 技术栈
- **前端框架**：Vue 3 + TypeScript + Vite
- **UI 框架**：Vuetify 3 (Material Design)
- **桌面方案**：Tauri 2（可选）
- **文件访问**：File System Access API（浏览器） / Tauri API（桌面）

## 2. 核心功能模块

### 2.1 项目管理模块

#### 功能描述
管理 Android 项目，扫描和识别资源目录。

#### 功能点
1. **项目导入**
   - 纯前端：使用 File System Access API 选择项目文件夹
   - Tauri：使用原生文件选择对话框
   - 支持拖放文件夹（Web）

2. **资源目录扫描**
   - 从项目根目录递归扫描所有 `res` 目录
   - 自动忽略构建目录（`build`, `.gradle`, `node_modules` 等）
   - 支持多模块 Android 项目
   - 显示资源目录树状列表

3. **项目配置持久化**
   - 保存项目路径和配置到本地存储
   - 支持最近打开项目列表
   - 配置文件：`android_trans.json`（可选）

#### 用户交互
```
[打开项目] 按钮
    ↓
文件夹选择对话框
    ↓
自动扫描 res 目录
    ↓
显示资源目录列表
```

#### 数据结构
```typescript
interface Project {
  projectDir: string;           // 项目根目录
  resDirs: ResDirInfo[];       // 资源目录列表
}

interface ResDirInfo {
  relativePath: string;         // 相对路径
  xmlFileNames: string[];       // XML 文件名列表
}
```

---

### 2.2 资源文件管理模块

#### 功能描述
解析、编辑和保存 Android 字符串资源 XML 文件。

#### 支持的资源类型
1. **`<string>` 标签**
   ```xml
   <string name="app_name">My App</string>
   <string name="welcome" translatable="false">Welcome</string>
   ```

2. **`<string-array>` 标签**
   ```xml
   <string-array name="countries">
       <item>China</item>
       <item>USA</item>
   </string-array>
   ```

#### 功能点
1. **文件列表显示**
   - 显示选中资源目录下的所有 `strings*.xml` 和 `arrays*.xml` 文件
   - 支持文件搜索和过滤

2. **多语言数据加载**
   - 自动识别 `values-*` 目录的语言代码
   - 按语言代码映射到对应语言
   - 构建多语言数据映射表

3. **数据表格展示**
   - 列：序号、资源ID、可翻译标记、各语言值
   - 支持水平和垂直滚动
   - 未翻译项高亮显示（红色边框）
   - 已翻译未保存项标记（蓝色边框）
   - 支持单元格内联编辑

4. **XML 生成和保存**
   - 按默认语言顺序生成 XML
   - 过滤 `translatable="false"` 的条目
   - 格式化输出（4空格缩进）
   - 保存到对应的 `values-*` 目录

#### 数据结构
```typescript
type ResourceType = 'string' | 'string-array';

interface ResItem {
  type: ResourceType;
  name: string;                          // 资源ID
  translatable: boolean;
  valueMap: Map<Language, string | string[]>;
}

interface XmlData {
  resDir: string;
  xmlFileName: string;
  items: Map<string, ResItem>;           // 原始数据
  translatedItems: Map<string, ResItem>; // 翻译数据
}
```

---

### 2.3 语言管理模块

#### 功能描述
管理支持的翻译语言，配置启用的语言列表。

#### 支持的语言
| 语言代码 | 中文名称 | 英文名称 | Android 代码 |
|---------|---------|---------|-------------|
| def     | 默认(英文) | Default(English) | (空) |
| cn      | 简体中文 | Simplified Chinese | zh-rCN |
| cnHk    | 繁體中文 | Traditional Chinese | zh-rHK |
| cnTw    | 繁體中文 | Traditional Chinese | zh-rTW |
| ar      | 阿拉伯语 | Arabic | ar |
| de      | 德语 | German | de |
| fr      | 法语 | French | fr |
| hi      | 印地语 | Hindi | hi |
| it      | 意大利语 | Italian | it |
| iw      | 希伯来语 | Hebrew | iw |
| ja      | 日语 | Japanese | ja |
| ko      | 韩语 | Korean | ko |
| ru      | 俄语 | Russian | ru |
| uk      | 乌克兰语 | Ukrainian | uk |

#### 功能点
1. **语言选择配置**
   - 在设置中选择启用的语言
   - 默认全部启用
   - 配置保存到本地存储

2. **语言代码映射**
   - Android 语言代码 ↔ 语言枚举
   - 生成 `values-*` 目录名

3. **翻译语言选择**
   - 在数据表格列头显示语言选择复选框
   - 支持批量选择/取消
   - "选中"按钮自动选择缺失翻译的语言

---

### 2.4 翻译引擎模块

#### 功能描述
集成 OpenAI API，执行自动翻译任务。

#### 翻译流程
```
收集需要翻译的条目
    ↓
构建 JSON 格式请求
    ↓
智能分块（20条/批）
    ↓
调用 OpenAI API (GPT-4o Mini)
    ↓
使用 JSON Mode 确保格式正确
    ↓
解析响应
    ↓
修正文本（转义单引号）
    ↓
实时更新 UI
```

#### 翻译提示词策略
根据目标语言自动选择提示词语言：
- 中文目标 → 中文提示词
- 繁体中文目标 → 繁体提示词
- 其他语言 → 英文提示词

**提示词模板（英文）**：
```
As a language translator, your task is to translate the text
content in the JSON format text I send into {TARGET_LANG}. Please
ensure not to write any explanations or other text, maintain the
JSON format for replies, only modifying the content that needs
translation. If the translated content includes double quotes,
please change them to single quotes.
```

#### API 配置
```typescript
interface TranslationConfig {
  apiUrl: string;              // API 端点
  apiToken: string;            // API 密钥
  model: 'gpt-4o-mini';        // 模型
  maxTokens: 4000;             // 最大令牌数
  topP: 0.8;                   // 采样参数
  timeout: 120000;             // 超时（毫秒）
  httpProxy?: string;          // HTTP 代理
}
```

#### 智能分块策略
```typescript
interface BatchConfig {
  maxItemsPerRequest: 20;      // 每批最大条目数
  maxRetries: 3;               // 最大重试次数
}
```

#### 功能点
1. **API 连接测试**
   - 发送测试请求验证配置
   - 显示响应时间
   - 显示翻译示例

2. **批量翻译**
   - 自动拆分大请求
   - 逐批翻译并实时回调
   - 显示进度条

3. **错误处理**
   - API 错误提示
   - 网络超时重试
   - 失败条目记录

4. **翻译进度**
   ```typescript
   interface TranslateProgress {
     working: boolean;
     currentLang: Language;
     langIndex: number;
     langCount: number;
     textTranslatedCount: number;
     textTotalCount: number;
   }
   ```

#### 数据格式

**请求格式**（JSON）：
```json
{
  "app_name": "My Application",
  "welcome_message": "Welcome to our app",
  "countries": ["China", "USA", "Japan"]
}
```

**响应格式**（JSON）：
```json
{
  "app_name": "我的应用",
  "welcome_message": "欢迎使用我们的应用",
  "countries": ["中国", "美国", "日本"]
}
```

---

### 2.5 用户界面模块

#### 主界面布局

```
┌─────────────────────────────────────────────────────┐
│  顶部工具栏                                          │
│  [打开项目] [设置] [一键翻译] [帮助]                 │
├──────────────┬──────────────────────────────────────┤
│              │  操作按钮区：                         │
│  资源目录    │  [一键翻译] [选中] [翻译选中] [保存] │
│  ├─ res1/    ├──────────────────────────────────────┤
│  └─ res2/    │  数据表格：                           │
│              │  ┌───┬──────┬────┬──────┬──────┐   │
│  资源文件    │  │序号│ID    │可翻│英文  │中文  │   │
│  ├─strings   │  │   │      │译  │ ☐    │ ☐    │   │
│  └─arrays    │  ├───┼──────┼────┼──────┼──────┤   │
│              │  │ 1 │app_n │ ✓  │My App│我的  │   │
│              │  └───┴──────┴────┴──────┴──────┘   │
├──────────────┴──────────────────────────────────────┤
│  日志窗口（可展开/折叠）                             │
├─────────────────────────────────────────────────────┤
│  状态栏: 翻译进度 | 统计信息        [日志窗口 ☑]    │
└─────────────────────────────────────────────────────┘
```

#### 功能点

1. **顶部工具栏**
   - 打开项目按钮
   - 设置按钮
   - 一键翻译按钮
   - 帮助/关于按钮

2. **左侧导航面板**
   - 资源目录树状列表
   - 资源文件列表
   - 支持搜索和过滤

3. **主内容区**
   - 操作按钮组
   - 数据表格（虚拟滚动）
   - 语言列动态显示
   - 单元格内联编辑

4. **底部面板**
   - 日志窗口（可展开/折叠）
   - 实时显示日志
   - 清除日志按钮

5. **状态栏**
   - 翻译进度显示
   - 统计信息（总条目数、已翻译数）
   - 日志窗口开关

---

### 2.6 设置管理模块

#### 设置分类

**1. API 设置**
```typescript
interface ApiSettings {
  apiUrl: string;              // API 端点
  apiToken: string;            // API 密钥
  httpProxy?: string;          // HTTP 代理
}
```

**2. 翻译语言设置**
- 多选列表显示所有支持的语言
- 勾选启用的语言
- 默认语言（英文）始终启用

**3. 界面设置**
```typescript
interface UiSettings {
  showLogView: boolean;        // 显示日志窗口
  leftPanelWidth: number;      // 左侧面板宽度
  bottomPanelHeight: number;   // 底部面板高度
  theme: 'light' | 'dark';     // 主题
}
```

**4. 高级设置**
```typescript
interface AdvancedSettings {
  maxItemsPerRequest: number;  // 每批最大条目数
  maxRetries: number;          // 最大重试次数
  requestTimeout: number;      // 请求超时
}
```

#### 配置持久化
- 纯前端：localStorage
- Tauri：原生文件存储
- 支持导入/导出配置

---

### 2.7 一键翻译功能

#### 功能描述
一键自动化翻译流程，简化用户操作。

#### 配置选项
```typescript
interface AutoTransConfig {
  autoSelect: boolean;         // 自动选择需要翻译的语言
  autoSave: boolean;           // 翻译完成后自动保存
  selectedLanguages?: Language[]; // 手动选择的语言
}
```

#### 工作流程
```
用户点击"一键翻译"
    ↓
显示配置对话框
    ↓
用户配置选项
    ↓
点击"开始"
    ↓
[如果自动选择] 扫描并选择缺失翻译的语言
    ↓
依次翻译每种语言
    ↓
实时更新进度和界面
    ↓
[如果自动保存] 保存所有翻译结果
    ↓
显示完成通知
```

#### 进度显示
- 当前翻译语言
- 语言进度（如：2/5）
- 当前语言的文本进度（如：15/50）
- 总体进度百分比
- 预计剩余时间

---

### 2.8 日志系统模块

#### 日志级别
```typescript
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4
}
```

#### 日志输出
1. **浏览器控制台**（开发调试）
2. **UI 日志窗口**（INFO 及以上级别）
3. **本地文件**（Tauri 版本，可选）

#### 日志内容
```typescript
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
}
```

#### 功能点
1. **实时日志显示**
   - 自动滚动到最新
   - 支持日志级别过滤
   - 支持关键词搜索

2. **日志管理**
   - 清除日志按钮
   - 导出日志（文本文件）
   - 日志历史记录（最近100条）

---

## 3. 用户工作流程

### 3.1 首次使用流程

```
1. 打开应用
   ↓
2. 点击"设置"按钮
   ↓
3. 配置 API 设置
   - 输入 API URL
   - 输入 API Key
   - （可选）配置代理
   ↓
4. 点击"测试连接"验证配置
   ↓
5. 切换到"翻译语言"标签
   ↓
6. 选择需要的语言
   ↓
7. 保存设置
```

### 3.2 日常翻译流程

```
1. 点击"打开项目"
   ↓
2. 选择 Android 项目文件夹
   ↓
3. 系统自动扫描 res 目录
   ↓
4. 在左侧选择资源目录
   ↓
5. 在左侧选择资源文件
   ↓
6. 查看数据表格
   ↓
7. 点击"一键翻译"
   ↓
8. 配置自动翻译选项
   - ☑ 自动选择语言
   - ☑ 自动保存
   ↓
9. 点击"开始"
   ↓
10. 等待翻译完成
    ↓
11. 检查翻译结果
    ↓
12. （如未自动保存）点击"保存"
```

### 3.3 手动翻译流程

```
1-6. 同上（打开项目和选择文件）
   ↓
7. 在数据表格列头勾选需要翻译的语言
   ↓
8. 点击"翻译选中语言"
   ↓
9. 等待翻译完成
   ↓
10. 检查翻译结果
    ↓
11. （可选）手动编辑个别条目
    ↓
12. 点击"保存"
```

---

## 4. 非功能性需求

### 4.1 性能要求
- 项目扫描：< 5秒（普通项目）
- XML 解析：< 1秒（1000条目）
- UI 响应：< 100ms（用户操作）
- 表格渲染：支持 10000+ 条目（虚拟滚动）

### 4.2 兼容性要求
- **浏览器**：
  - Chrome 86+ (File System Access API)
  - Edge 86+
  - Firefox（通过 polyfill）
  - Safari（部分功能受限）

- **桌面系统**（Tauri 版本）：
  - Windows 10/11
  - macOS 10.15+
  - Linux（主流发行版）

### 4.3 安全要求

- API Key 加密存储
- HTTPS 通信
- 不上传项目文件到服务器
- 本地处理所有数据

### 4.4 可用性要求
- 界面语言：中文、英文
- 快捷键支持
- 响应式布局
- 错误提示友好

---

## 5. 数据结构总览

### 5.1 核心数据模型

```typescript
// 项目模型
interface Project {
  projectDir: string;
  resDirs: ResDirInfo[];
}

interface ResDirInfo {
  relativePath: string;
  xmlFileNames: string[];
}

// 资源数据模型
interface XmlData {
  resDir: string;
  xmlFileName: string;
  items: Map<string, ResItem>;
  translatedItems: Map<string, ResItem>;
}

interface ResItem {
  type: 'string' | 'string-array';
  name: string;
  translatable: boolean;
  valueMap: Map<Language, string | string[]>;
}

// 翻译模型
interface TransRequest {
  targetLang: Language;
  items: TransItem[];
}

interface TransItem {
  key: string;
  srcValue: string | string[];
  dstValue?: string | string[];
}

interface TransResponse {
  targetLang: Language;
  items: TransItem[];
}

// 配置模型
interface AppConfig {
  api: ApiSettings;
  languages: Language[];
  ui: UiSettings;
  advanced: AdvancedSettings;
}
```

---

## 6. 技术架构概览

### 6.1 架构分层

```
┌─────────────────────────────────────┐
│          UI Layer (Vue)             │
│  Components | Pages | Layouts       │
├─────────────────────────────────────┤
│       Business Logic Layer          │
│  Stores (Pinia) | Composables       │
├─────────────────────────────────────┤
│        Service Layer                │
│  Translation | XML Parser | Config  │
├─────────────────────────────────────┤
│      Adapter Layer (重要!)          │
│  File System | Storage | Platform   │
├─────────────────────────────────────┤
│     Platform Layer (条件引入)        │
│  Browser APIs | Tauri APIs          │
└─────────────────────────────────────┘
```

### 6.2 关键技术点

1. **文件系统适配层**
   - 统一接口
   - 运行时检测平台
   - 自动选择实现

2. **状态管理**
   - Pinia（Vue 3 官方推荐）
   - 模块化设计

3. **虚拟滚动**
   - 大数据表格性能优化
   - 使用 `vue-virtual-scroller`

4. **XML 处理**
   - 使用 `fast-xml-parser`
   - 支持格式化输出

5. **API 集成**
   - 使用 `axios`
   - 支持取消请求
   - 错误重试机制

---

## 7. 待实现功能（后期迭代）

### 7.1 高优先级
- [ ] 翻译进度报告（详细统计）
- [ ] 智能分块机制（根据文本长度动态调整）
- [ ] 翻译历史记录和撤销功能

### 7.2 中优先级
- [ ] 术语表支持（专业术语对照）
- [ ] 翻译记忆功能（避免重复翻译）
- [ ] 多翻译引擎支持（Google Translate、DeepL）

### 7.3 低优先级
- [ ] 上下文感知翻译（提供字符串上下文）
- [ ] 翻译质量评估
- [ ] 协作翻译功能（多人协作）

---

## 8. 项目里程碑

### Phase 1: 核心功能（2-3周）
- ✓ 项目初始化和配置
- ✓ 文件系统适配层实现
- ✓ XML 解析和生成
- ✓ 基础 UI 框架
- ✓ OpenAI 翻译集成

### Phase 2: 完善功能（1-2周）
- 设置管理
- 一键翻译
- 日志系统
- 错误处理

### Phase 3: 优化和测试（1周）
- 性能优化
- UI/UX 优化
- 测试和修复 Bug
- 文档完善

### Phase 4: Tauri 集成（1周）
- Tauri 2 配置
- 原生文件系统集成
- 打包和分发

---

## 9. 附录

### 9.1 术语表
- **资源目录**：Android 项目中的 `res` 目录
- **资源文件**：`res/values*/` 下的 XML 文件
- **资源ID**：XML 中的 `name` 属性值
- **默认语言**：`values/` 目录中的语言（通常是英文）
- **目标语言**：需要翻译的目标语言

### 9.2 参考文档
- [Android Localization Guide](https://developer.android.com/guide/topics/resources/localization)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Tauri 2 Documentation](https://v2.tauri.app/)

---

**文档版本**: v1.0
**创建日期**: 2025-11-01
**最后更新**: 2025-11-01
