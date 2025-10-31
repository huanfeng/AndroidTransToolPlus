# Android Trans Tool Plus - 技术架构文档

## 1. 架构概览

### 1.1 总体架构

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Vue 3      │  │  Vuetify 3   │  │  Vue Router  │   │
│  │  Components  │  │   (UI Kit)   │  │   (Routing)  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│                  State Management Layer                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │                   Pinia Stores                    │    │
│  │  • ProjectStore  • TranslationStore  • UIStore   │    │
│  │  • ConfigStore   • LogStore                      │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│                   Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Composables │  │   Services   │  │   Utils      │   │
│  │  (Hooks)     │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│                     Service Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Translation  │  │  XML Parser  │  │ Config Mgmt  │   │
│  │   Service    │  │   Service    │  │   Service    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│              Platform Adapter Layer (关键!)               │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Unified Platform API                 │    │
│  │  • FileSystem  • Storage  • Platform Detection   │    │
│  └──────────────────────────────────────────────────┘    │
│                          ↓  ↓                             │
│          ┌───────────────┘  └───────────────┐            │
│          ↓                                    ↓            │
│  ┌──────────────┐                   ┌──────────────┐     │
│  │   Browser    │                   │    Tauri     │     │
│  │ Implementation│                   │Implementation│     │
│  └──────────────┘                   └──────────────┘     │
└───────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────┐
│                    Platform Layer                         │
│  ┌──────────────┐                   ┌──────────────┐     │
│  │  Browser     │                   │    Tauri     │     │
│  │  APIs        │                   │    APIs      │     │
│  └──────────────┘                   └──────────────┘     │
└───────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

#### 前端框架
- **Vue 3**: 使用 Composition API
- **TypeScript**: 强类型支持
- **Vite**: 快速构建工具

#### UI 框架
- **Vuetify 3**: Material Design 组件库
- **Material Design Icons**: 图标库

#### 状态管理
- **Pinia**: Vue 3 官方状态管理库

#### 路由
- **Vue Router 4**: 前端路由

#### 工具库
- **fast-xml-parser**: XML 解析和生成
- **axios**: HTTP 客户端
- **lodash-es**: 工具函数库

#### 桌面平台
- **Tauri 2**: 原生桌面应用框架
- **Rust**: Tauri 后端语言

---

## 2. 目录结构

```
android_trans_tool_plus/
├── docs/                          # 文档目录
│   ├── PRD.md                    # 产品需求文档
│   ├── ARCHITECTURE.md           # 技术架构文档
│   └── API.md                    # API 文档
├── src/                           # 源代码目录
│   ├── main.ts                   # 应用入口
│   ├── App.vue                   # 根组件
│   ├── assets/                   # 静态资源
│   │   ├── styles/               # 样式文件
│   │   └── images/               # 图片资源
│   ├── components/               # 公共组件
│   │   ├── common/               # 通用组件
│   │   │   ├── AppToolbar.vue
│   │   │   ├── LogViewer.vue
│   │   │   └── ProgressBar.vue
│   │   ├── project/              # 项目相关组件
│   │   │   ├── ProjectTree.vue
│   │   │   ├── ResourceList.vue
│   │   │   └── FileList.vue
│   │   └── translation/          # 翻译相关组件
│   │       ├── TranslationTable.vue
│   │       ├── LanguageSelector.vue
│   │       └── TranslationProgress.vue
│   ├── views/                    # 页面组件
│   │   ├── Home.vue              # 主页面
│   │   ├── Settings.vue          # 设置页面
│   │   └── About.vue             # 关于页面
│   ├── stores/                   # Pinia 状态管理
│   │   ├── project.ts            # 项目状态
│   │   ├── translation.ts        # 翻译状态
│   │   ├── config.ts             # 配置状态
│   │   ├── ui.ts                 # UI 状态
│   │   └── log.ts                # 日志状态
│   ├── services/                 # 服务层
│   │   ├── translation/          # 翻译服务
│   │   │   ├── openai.ts        # OpenAI 集成
│   │   │   ├── translator.ts    # 翻译器主类
│   │   │   └── prompts.ts       # 提示词管理
│   │   ├── xml/                  # XML 处理服务
│   │   │   ├── parser.ts        # XML 解析
│   │   │   ├── generator.ts     # XML 生成
│   │   │   └── validator.ts     # XML 验证
│   │   ├── project/              # 项目服务
│   │   │   ├── scanner.ts       # 目录扫描
│   │   │   └── loader.ts        # 项目加载
│   │   └── config/               # 配置服务
│   │       ├── manager.ts       # 配置管理
│   │       └── storage.ts       # 配置存储
│   ├── adapters/                 # 平台适配层（重要！）
│   │   ├── index.ts              # 统一导出
│   │   ├── types.ts              # 类型定义
│   │   ├── filesystem/           # 文件系统适配
│   │   │   ├── index.ts         # 统一接口
│   │   │   ├── browser.ts       # 浏览器实现
│   │   │   └── tauri.ts         # Tauri 实现
│   │   ├── storage/              # 存储适配
│   │   │   ├── index.ts
│   │   │   ├── browser.ts       # localStorage
│   │   │   └── tauri.ts         # Tauri Store
│   │   └── platform/             # 平台检测
│   │       └── index.ts
│   ├── models/                   # 数据模型
│   │   ├── project.ts            # 项目模型
│   │   ├── resource.ts           # 资源模型
│   │   ├── language.ts           # 语言模型
│   │   └── translation.ts        # 翻译模型
│   ├── composables/              # Composition API Hooks
│   │   ├── useProject.ts
│   │   ├── useTranslation.ts
│   │   ├── useFileSystem.ts
│   │   └── useLogger.ts
│   ├── utils/                    # 工具函数
│   │   ├── string.ts             # 字符串处理
│   │   ├── file.ts               # 文件处理
│   │   ├── logger.ts             # 日志工具
│   │   └── validators.ts         # 验证器
│   ├── types/                    # TypeScript 类型定义
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── global.d.ts
│   └── router/                   # 路由配置
│       └── index.ts
├── src-tauri/                    # Tauri 后端代码
│   ├── src/
│   │   ├── main.rs               # Rust 入口
│   │   ├── commands.rs           # Tauri 命令
│   │   └── lib.rs
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── public/                       # 公共资源
│   └── favicon.ico
├── index.html                    # HTML 入口
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 项目配置
└── README.md                     # 项目说明
```

---

## 3. 核心模块设计

### 3.1 平台适配层（最重要！）

#### 3.1.1 设计理念

平台适配层是整个架构的核心，确保应用可以同时运行在浏览器和 Tauri 环境中。

**设计原则**：
1. **统一接口**：上层代码只依赖抽象接口，不依赖具体实现
2. **运行时检测**：自动检测当前运行环境
3. **条件编译**：使用 Vite 的环境变量和动态导入
4. **类型安全**：TypeScript 确保类型一致性

#### 3.1.2 接口定义

**文件系统接口** (`adapters/filesystem/index.ts`)

```typescript
// 目录句柄接口
export interface DirectoryHandle {
  name: string;
  kind: 'directory';
  getFileHandle(name: string): Promise<FileHandle>;
  getDirectoryHandle(name: string): Promise<DirectoryHandle>;
  entries(): AsyncIterable<[string, FileHandle | DirectoryHandle]>;
}

// 文件句柄接口
export interface FileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<WritableStream>;
}

// 文件系统适配器接口
export interface FileSystemAdapter {
  // 选择目录
  selectDirectory(): Promise<DirectoryHandle | null>;

  // 读取文件
  readFile(handle: FileHandle): Promise<string>;

  // 写入文件
  writeFile(handle: FileHandle, content: string): Promise<void>;

  // 创建文件
  createFile(
    dirHandle: DirectoryHandle,
    fileName: string,
    content: string
  ): Promise<FileHandle>;

  // 检查文件是否存在
  exists(
    dirHandle: DirectoryHandle,
    fileName: string
  ): Promise<boolean>;

  // 遍历目录
  readDirectory(
    dirHandle: DirectoryHandle
  ): AsyncIterable<[string, FileHandle | DirectoryHandle]>;
}
```

**存储接口** (`adapters/storage/index.ts`)

```typescript
export interface StorageAdapter {
  // 获取配置
  get<T>(key: string, defaultValue?: T): Promise<T | null>;

  // 设置配置
  set<T>(key: string, value: T): Promise<void>;

  // 删除配置
  remove(key: string): Promise<void>;

  // 清空所有配置
  clear(): Promise<void>;

  // 获取所有键
  keys(): Promise<string[]>;
}
```

#### 3.1.3 实现示例

**浏览器实现** (`adapters/filesystem/browser.ts`)

```typescript
export class BrowserFileSystem implements FileSystemAdapter {
  async selectDirectory(): Promise<DirectoryHandle | null> {
    try {
      // @ts-ignore - File System Access API
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      return this.wrapDirectoryHandle(handle);
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  async readFile(handle: FileHandle): Promise<string> {
    const file = await handle.getFile();
    return await file.text();
  }

  async writeFile(handle: FileHandle, content: string): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  // ... 其他方法实现
}
```

**Tauri 实现** (`adapters/filesystem/tauri.ts`)

```typescript
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';

export class TauriFileSystem implements FileSystemAdapter {
  async selectDirectory(): Promise<DirectoryHandle | null> {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (!selected) return null;

    return this.createDirectoryHandle(selected as string);
  }

  async readFile(handle: FileHandle): Promise<string> {
    const path = (handle as any).path;
    return await readTextFile(path);
  }

  async writeFile(handle: FileHandle, content: string): Promise<void> {
    const path = (handle as any).path;
    await writeTextFile(path, content);
  }

  // ... 其他方法实现
}
```

**统一导出** (`adapters/index.ts`)

```typescript
import { isTauri } from './platform';

let fileSystemAdapter: FileSystemAdapter;
let storageAdapter: StorageAdapter;

// 运行时检测并初始化
if (isTauri()) {
  const { TauriFileSystem } = await import('./filesystem/tauri');
  const { TauriStorage } = await import('./storage/tauri');
  fileSystemAdapter = new TauriFileSystem();
  storageAdapter = new TauriStorage();
} else {
  const { BrowserFileSystem } = await import('./filesystem/browser');
  const { BrowserStorage } = await import('./storage/browser');
  fileSystemAdapter = new BrowserFileSystem();
  storageAdapter = new BrowserStorage();
}

export { fileSystemAdapter, storageAdapter };
```

**平台检测** (`adapters/platform/index.ts`)

```typescript
export function isTauri(): boolean {
  return '__TAURI__' in window;
}

export function getBrowserPlatform(): string {
  return navigator.platform;
}

export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}
```

---

### 3.2 数据模型层

#### 3.2.1 语言模型 (`models/language.ts`)

```typescript
export enum Language {
  DEF = 'def',
  CN = 'cn',
  CN_HK = 'cnHk',
  CN_TW = 'cnTw',
  AR = 'ar',
  DE = 'de',
  FR = 'fr',
  HI = 'hi',
  IT = 'it',
  IW = 'iw',
  JA = 'ja',
  KO = 'ko',
  RU = 'ru',
  UK = 'uk',
}

export interface LanguageInfo {
  code: Language;
  androidCode: string;      // Android 语言代码
  nameCn: string;            // 中文名称
  nameEn: string;            // 英文名称
  valuesDirName: string;     // values 目录名
}

export const LANGUAGE_MAP: Record<Language, LanguageInfo> = {
  [Language.DEF]: {
    code: Language.DEF,
    androidCode: '',
    nameCn: '默认(英文)',
    nameEn: 'Default(English)',
    valuesDirName: 'values',
  },
  [Language.CN]: {
    code: Language.CN,
    androidCode: 'zh-rCN',
    nameCn: '简体中文',
    nameEn: 'Simplified Chinese',
    valuesDirName: 'values-zh-rCN',
  },
  // ... 其他语言
};

// 从 Android 代码获取语言
export function getLanguageByAndroidCode(code: string): Language | null {
  for (const [key, info] of Object.entries(LANGUAGE_MAP)) {
    if (info.androidCode === code) {
      return key as Language;
    }
  }
  return null;
}
```

#### 3.2.2 资源模型 (`models/resource.ts`)

```typescript
export type ResourceType = 'string' | 'string-array';

export interface ResItem {
  type: ResourceType;
  name: string;                           // 资源ID
  translatable: boolean;
  valueMap: Map<Language, string | string[]>;
}

export class StringItem implements ResItem {
  type: ResourceType = 'string';
  name: string;
  translatable: boolean = true;
  valueMap: Map<Language, string>;

  constructor(name: string, translatable: boolean = true) {
    this.name = name;
    this.translatable = translatable;
    this.valueMap = new Map();
  }

  getValue(lang: Language): string | undefined {
    return this.valueMap.get(lang);
  }

  setValue(lang: Language, value: string): void {
    this.valueMap.set(lang, value);
  }

  hasValue(lang: Language): boolean {
    return this.valueMap.has(lang) && this.valueMap.get(lang) !== '';
  }
}

export class ArrayItem implements ResItem {
  type: ResourceType = 'string-array';
  name: string;
  translatable: boolean = true;
  valueMap: Map<Language, string[]>;

  constructor(name: string, translatable: boolean = true) {
    this.name = name;
    this.translatable = translatable;
    this.valueMap = new Map();
  }

  getValue(lang: Language): string[] | undefined {
    return this.valueMap.get(lang);
  }

  setValue(lang: Language, value: string[]): void {
    this.valueMap.set(lang, value);
  }

  hasValue(lang: Language): boolean {
    const value = this.valueMap.get(lang);
    return value !== undefined && value.length > 0;
  }
}
```

#### 3.2.3 项目模型 (`models/project.ts`)

```typescript
import type { DirectoryHandle } from '@/adapters/types';

export interface ResDirInfo {
  relativePath: string;       // 相对路径
  absolutePath: string;       // 绝对路径
  dirHandle: DirectoryHandle; // 目录句柄
  xmlFileNames: string[];     // XML 文件名列表
}

export class Project {
  projectDir: string;
  projectHandle: DirectoryHandle;
  resDirs: ResDirInfo[] = [];

  constructor(projectDir: string, projectHandle: DirectoryHandle) {
    this.projectDir = projectDir;
    this.projectHandle = projectHandle;
  }

  async scanResDirs(): Promise<void> {
    this.resDirs = [];
    await this._scanDirectory(this.projectHandle, '');
  }

  private async _scanDirectory(
    dirHandle: DirectoryHandle,
    relativePath: string
  ): Promise<void> {
    // 忽略的目录
    const ignoreDirs = ['build', '.gradle', '.idea', 'node_modules'];

    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        // 检查是否为 res 目录
        if (name === 'res') {
          const resDir = await this._createResDirInfo(
            handle,
            relativePath + '/' + name
          );
          this.resDirs.push(resDir);
        } else if (!ignoreDirs.includes(name)) {
          // 递归扫描子目录
          await this._scanDirectory(
            handle,
            relativePath + '/' + name
          );
        }
      }
    }
  }

  private async _createResDirInfo(
    dirHandle: DirectoryHandle,
    relativePath: string
  ): Promise<ResDirInfo> {
    const xmlFileNames: string[] = [];

    // 扫描 values* 目录
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory' && name.startsWith('values')) {
        const valuesHandle = handle as DirectoryHandle;
        for await (const [fileName, fileHandle] of valuesHandle.entries()) {
          if (
            fileHandle.kind === 'file' &&
            (fileName.startsWith('strings') || fileName.startsWith('arrays')) &&
            fileName.endsWith('.xml')
          ) {
            if (!xmlFileNames.includes(fileName)) {
              xmlFileNames.push(fileName);
            }
          }
        }
      }
    }

    return {
      relativePath,
      absolutePath: this.projectDir + relativePath,
      dirHandle,
      xmlFileNames,
    };
  }
}
```

#### 3.2.4 XML 数据模型 (`models/resource.ts` 扩展)

```typescript
export class XmlData {
  resDir: ResDirInfo;
  xmlFileName: string;
  items: Map<string, ResItem> = new Map();           // 原始数据
  translatedItems: Map<string, ResItem> = new Map(); // 翻译数据

  constructor(resDir: ResDirInfo, xmlFileName: string) {
    this.resDir = resDir;
    this.xmlFileName = xmlFileName;
  }

  // 加载所有语言的数据
  async load(languages: Language[]): Promise<void> {
    this.items.clear();

    for (const lang of languages) {
      await this._loadLanguage(lang);
    }
  }

  private async _loadLanguage(lang: Language): Promise<void> {
    const valuesDirName = LANGUAGE_MAP[lang].valuesDirName;

    try {
      // 获取目录句柄
      const valuesHandle = await this.resDir.dirHandle.getDirectoryHandle(
        valuesDirName
      );

      // 读取 XML 文件
      const fileHandle = await valuesHandle.getFileHandle(this.xmlFileName);
      const content = await fileSystemAdapter.readFile(fileHandle);

      // 解析 XML
      this._parseXml(content, lang);
    } catch (error) {
      console.warn(`Failed to load ${lang}/${this.xmlFileName}:`, error);
    }
  }

  private _parseXml(content: string, lang: Language): void {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const result = parser.parse(content);
    const resources = result.resources;

    if (!resources) return;

    // 处理 string 标签
    if (resources.string) {
      const strings = Array.isArray(resources.string)
        ? resources.string
        : [resources.string];

      for (const str of strings) {
        const name = str['@_name'];
        const value = str['#text'] || '';
        const translatable = str['@_translatable'] !== 'false';

        let item = this.items.get(name) as StringItem;
        if (!item) {
          item = new StringItem(name, translatable);
          this.items.set(name, item);
        }
        item.setValue(lang, value);
      }
    }

    // 处理 string-array 标签
    if (resources['string-array']) {
      const arrays = Array.isArray(resources['string-array'])
        ? resources['string-array']
        : [resources['string-array']];

      for (const arr of arrays) {
        const name = arr['@_name'];
        const translatable = arr['@_translatable'] !== 'false';
        const items = Array.isArray(arr.item) ? arr.item : [arr.item];
        const values = items.map((item: any) => item['#text'] || '');

        let item = this.items.get(name) as ArrayItem;
        if (!item) {
          item = new ArrayItem(name, translatable);
          this.items.set(name, item);
        }
        item.setValue(lang, values);
      }
    }
  }

  // 获取显示数据（翻译数据覆盖原始数据）
  getDisplayItems(): Map<string, ResItem> {
    const display = new Map(this.items);

    for (const [key, item] of this.translatedItems) {
      const original = display.get(key);
      if (original) {
        // 合并翻译数据
        for (const [lang, value] of item.valueMap) {
          original.valueMap.set(lang, value);
        }
      }
    }

    return display;
  }

  // 保存翻译结果
  async save(languages: Language[]): Promise<void> {
    // 合并翻译数据到原始数据
    for (const [key, item] of this.translatedItems) {
      const original = this.items.get(key);
      if (original) {
        for (const [lang, value] of item.valueMap) {
          original.valueMap.set(lang, value);
        }
      }
    }

    // 清空翻译数据
    this.translatedItems.clear();

    // 保存每种语言
    for (const lang of languages) {
      if (lang === Language.DEF) continue; // 不保存默认语言
      await this._saveLanguage(lang);
    }
  }

  private async _saveLanguage(lang: Language): Promise<void> {
    const valuesDirName = LANGUAGE_MAP[lang].valuesDirName;
    const xml = this._buildXml(lang);

    try {
      // 获取或创建目录
      let valuesHandle: DirectoryHandle;
      try {
        valuesHandle = await this.resDir.dirHandle.getDirectoryHandle(
          valuesDirName
        );
      } catch {
        valuesHandle = await this.resDir.dirHandle.getDirectoryHandle(
          valuesDirName,
          { create: true }
        );
      }

      // 写入文件
      await fileSystemAdapter.createFile(
        valuesHandle,
        this.xmlFileName,
        xml
      );
    } catch (error) {
      console.error(`Failed to save ${lang}/${this.xmlFileName}:`, error);
      throw error;
    }
  }

  private _buildXml(lang: Language): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '    ',
    });

    const resources: any = {};
    const strings: any[] = [];
    const arrays: any[] = [];

    // 按默认语言顺序排列
    for (const [name, item] of this.items) {
      if (!item.translatable) continue;

      const value = item.valueMap.get(lang);
      if (!value) continue;

      if (item.type === 'string') {
        strings.push({
          '@_name': name,
          '#text': value,
        });
      } else if (item.type === 'string-array') {
        arrays.push({
          '@_name': name,
          item: (value as string[]).map(v => ({ '#text': v })),
        });
      }
    }

    if (strings.length > 0) {
      resources.string = strings;
    }
    if (arrays.length > 0) {
      resources['string-array'] = arrays;
    }

    const xml = builder.build({ resources });
    return '<?xml version="1.0" encoding="utf-8"?>\n' + xml;
  }
}
```

---

### 3.3 状态管理层（Pinia Stores）

#### 3.3.1 项目状态 (`stores/project.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Project, ResDirInfo } from '@/models/project';
import type { XmlData } from '@/models/resource';

export const useProjectStore = defineStore('project', () => {
  // 状态
  const project = ref<Project | null>(null);
  const selectedResDirIndex = ref<number>(-1);
  const selectedXmlFileName = ref<string>('');
  const xmlData = ref<XmlData | null>(null);
  const loading = ref(false);

  // 计算属性
  const selectedResDir = computed<ResDirInfo | null>(() => {
    if (!project.value || selectedResDirIndex.value < 0) {
      return null;
    }
    return project.value.resDirs[selectedResDirIndex.value] || null;
  });

  const hasProject = computed(() => project.value !== null);

  // 方法
  async function openProject(dirHandle: DirectoryHandle): Promise<void> {
    loading.value = true;
    try {
      const proj = new Project(dirHandle.name, dirHandle);
      await proj.scanResDirs();
      project.value = proj;

      // 重置选择
      selectedResDirIndex.value = -1;
      selectedXmlFileName.value = '';
      xmlData.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function selectResDir(index: number): Promise<void> {
    selectedResDirIndex.value = index;
    selectedXmlFileName.value = '';
    xmlData.value = null;
  }

  async function selectXmlFile(fileName: string): Promise<void> {
    if (!selectedResDir.value) return;

    loading.value = true;
    try {
      const data = new XmlData(selectedResDir.value, fileName);
      await data.load(enabledLanguages); // 从 configStore 获取

      selectedXmlFileName.value = fileName;
      xmlData.value = data;
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    project.value = null;
    selectedResDirIndex.value = -1;
    selectedXmlFileName.value = '';
    xmlData.value = null;
  }

  return {
    // 状态
    project,
    selectedResDirIndex,
    selectedXmlFileName,
    xmlData,
    loading,
    // 计算属性
    selectedResDir,
    hasProject,
    // 方法
    openProject,
    selectResDir,
    selectXmlFile,
    reset,
  };
});
```

#### 3.3.2 翻译状态 (`stores/translation.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Language } from '@/models/language';
import type { TranslateProgress } from '@/services/translation/translator';

export const useTranslationStore = defineStore('translation', () => {
  // 状态
  const selectedLanguages = ref<Set<Language>>(new Set());
  const progress = ref<TranslateProgress | null>(null);
  const translating = ref(false);

  // 计算属性
  const hasSelection = computed(() => selectedLanguages.value.size > 0);
  const progressPercentage = computed(() => {
    if (!progress.value) return 0;
    const { textTranslatedCount, textTotalCount } = progress.value;
    return Math.round((textTranslatedCount / textTotalCount) * 100);
  });

  // 方法
  function toggleLanguage(lang: Language): void {
    if (selectedLanguages.value.has(lang)) {
      selectedLanguages.value.delete(lang);
    } else {
      selectedLanguages.value.add(lang);
    }
  }

  function selectAll(languages: Language[]): void {
    selectedLanguages.value = new Set(languages);
  }

  function clearSelection(): void {
    selectedLanguages.value.clear();
  }

  function updateProgress(prog: TranslateProgress): void {
    progress.value = prog;
  }

  function startTranslation(): void {
    translating.value = true;
  }

  function stopTranslation(): void {
    translating.value = false;
    progress.value = null;
  }

  return {
    // 状态
    selectedLanguages,
    progress,
    translating,
    // 计算属性
    hasSelection,
    progressPercentage,
    // 方法
    toggleLanguage,
    selectAll,
    clearSelection,
    updateProgress,
    startTranslation,
    stopTranslation,
  };
});
```

#### 3.3.3 配置状态 (`stores/config.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { storageAdapter } from '@/adapters';
import type { Language } from '@/models/language';

export interface AppConfig {
  apiUrl: string;
  apiToken: string;
  httpProxy: string;
  enabledLanguages: Language[];
  maxItemsPerRequest: number;
  autoRetry: boolean;
  maxRetries: number;
  requestTimeout: number;
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'https://api.openai.com/v1',
  apiToken: '',
  httpProxy: '',
  enabledLanguages: Object.values(Language),
  maxItemsPerRequest: 20,
  autoRetry: true,
  maxRetries: 3,
  requestTimeout: 120000,
};

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig>({ ...DEFAULT_CONFIG });
  const loaded = ref(false);

  // 加载配置
  async function load(): Promise<void> {
    const saved = await storageAdapter.get<AppConfig>('app_config');
    if (saved) {
      config.value = { ...DEFAULT_CONFIG, ...saved };
    }
    loaded.value = true;
  }

  // 保存配置
  async function save(): Promise<void> {
    await storageAdapter.set('app_config', config.value);
  }

  // 自动保存
  watch(
    config,
    () => {
      if (loaded.value) {
        save();
      }
    },
    { deep: true }
  );

  // 更新单个配置
  function update(key: keyof AppConfig, value: any): void {
    (config.value as any)[key] = value;
  }

  // 重置配置
  function reset(): void {
    config.value = { ...DEFAULT_CONFIG };
  }

  return {
    config,
    loaded,
    load,
    save,
    update,
    reset,
  };
});
```

---

### 3.4 服务层

#### 3.4.1 翻译服务 (`services/translation/translator.ts`)

```typescript
import axios, { type AxiosInstance } from 'axios';
import type { Language } from '@/models/language';
import type { ResItem } from '@/models/resource';
import { getPrompt } from './prompts';

export interface TransItem {
  key: string;
  srcValue: string | string[];
  dstValue?: string | string[];
}

export interface TransRequest {
  targetLang: Language;
  items: TransItem[];
}

export interface TransResponse {
  targetLang: Language;
  items: TransItem[];
}

export interface TranslateProgress {
  working: boolean;
  currentLang: Language;
  langIndex: number;
  langCount: number;
  textTranslatedCount: number;
  textTotalCount: number;
}

export interface TranslatorConfig {
  apiUrl: string;
  apiToken: string;
  httpProxy?: string;
  maxItemsPerRequest?: number;
  timeout?: number;
}

export class Translator {
  private client: AxiosInstance;
  private config: TranslatorConfig;

  constructor(config: TranslatorConfig) {
    this.config = {
      maxItemsPerRequest: 20,
      timeout: 120000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
      // 代理配置（如果提供）
      proxy: this.config.httpProxy ? {
        host: this.config.httpProxy.split(':')[0],
        port: parseInt(this.config.httpProxy.split(':')[1]),
      } : undefined,
    });
  }

  // 测试连接
  async test(): Promise<{ success: boolean; message: string; time: number }> {
    const startTime = Date.now();

    try {
      const request: TransRequest = {
        targetLang: Language.CN,
        items: [{ key: 'test', srcValue: 'Hello' }],
      };

      const response = await this.translate(request);
      const time = Date.now() - startTime;

      return {
        success: true,
        message: `Test successful: "${response.items[0].dstValue}"`,
        time,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Test failed',
        time: Date.now() - startTime,
      };
    }
  }

  // 翻译单个请求
  async translate(request: TransRequest): Promise<TransResponse> {
    const prompt = getPrompt(request.targetLang);
    const jsonData = this._buildJsonData(request.items);

    const response = await this.client.post('/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(jsonData) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      top_p: 0.8,
    });

    const content = response.data.choices[0].message.content;
    const translated = JSON.parse(content);

    return {
      targetLang: request.targetLang,
      items: request.items.map(item => ({
        ...item,
        dstValue: this._fixText(translated[item.key]),
      })),
    };
  }

  // 翻译多个请求（自动分块）
  async translateBatch(
    request: TransRequest,
    onProgress: (response: TransResponse) => void
  ): Promise<void> {
    const batches = this._splitRequest(
      request,
      this.config.maxItemsPerRequest!
    );

    for (const batch of batches) {
      const response = await this.translate(batch);
      onProgress(response);
    }
  }

  // 构建 JSON 数据
  private _buildJsonData(items: TransItem[]): Record<string, any> {
    const data: Record<string, any> = {};
    for (const item of items) {
      data[item.key] = item.srcValue;
    }
    return data;
  }

  // 修正文本（转义单引号）
  private _fixText(text: any): any {
    if (typeof text === 'string') {
      return text.replace(/'/g, "\\'");
    } else if (Array.isArray(text)) {
      return text.map(t => t.replace(/'/g, "\\'"));
    }
    return text;
  }

  // 拆分请求
  private _splitRequest(
    request: TransRequest,
    maxItems: number
  ): TransRequest[] {
    const batches: TransRequest[] = [];
    const items = request.items;

    for (let i = 0; i < items.length; i += maxItems) {
      batches.push({
        targetLang: request.targetLang,
        items: items.slice(i, i + maxItems),
      });
    }

    return batches;
  }
}
```

---

## 4. 构建和部署

### 4.1 开发环境

```bash
# 安装依赖
npm install

# 运行开发服务器（纯前端）
npm run dev

# 运行开发服务器（Tauri）
npm run tauri dev
```

### 4.2 生产构建

```bash
# 构建纯前端版本
npm run build

# 构建 Tauri 桌面应用
npm run tauri build
```

### 4.3 环境变量

```env
# .env.development
VITE_APP_MODE=browser

# .env.production
VITE_APP_MODE=browser

# .env.tauri
VITE_APP_MODE=tauri
```

### 4.4 Vite 配置 (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          vuetify: ['vuetify'],
        },
      },
    },
  },
});
```

---

## 5. 关键技术决策

### 5.1 为什么选择 Pinia 而不是 Vuex?
- Pinia 是 Vue 3 官方推荐的状态管理库
- 更好的 TypeScript 支持
- 更简洁的 API
- 更好的开发者体验

### 5.2 为什么使用平台适配层?
- 实现代码复用（90%+ 代码共享）
- 统一接口降低复杂度
- 易于维护和测试
- 支持未来扩展（如 Electron）

### 5.3 为什么选择 fast-xml-parser?
- 性能优秀
- 支持双向转换（解析和生成）
- 支持格式化输出
- TypeScript 支持良好

### 5.4 为什么使用 Composition API?
- 更好的逻辑复用
- 更好的 TypeScript 推导
- 更灵活的代码组织
- Vue 3 的推荐方式

---

## 6. 性能优化策略

### 6.1 虚拟滚动
- 使用 `vue-virtual-scroller` 处理大数据表格
- 只渲染可见区域的行
- 支持 10000+ 条目

### 6.2 异步加载
- 懒加载组件
- 按需加载语言文件
- 动态导入平台适配器

### 6.3 请求优化
- 批量翻译请求
- 请求缓存
- 自动重试机制

### 6.4 UI 优化
- 使用 `v-memo` 优化列表渲染
- 使用 `shallowRef` 优化大对象
- 防抖和节流

---

## 7. 安全考虑

### 7.1 API Token 存储
- 加密存储到本地存储
- 不在日志中输出
- 支持环境变量配置

### 7.2 文件访问权限
- 浏览器：用户授权才能访问
- Tauri：沙盒环境限制

### 7.3 HTTPS
- 生产环境强制 HTTPS
- API 通信加密

---

**文档版本**: v1.0
**创建日期**: 2025-11-01
**最后更新**: 2025-11-01
