<template>
  <div class="table-wrap">
    <el-empty
      v-if="!projectStore.selectedXmlData || !projectStore.selectedXmlFile"
      description="请选择左侧 XML 文件"
    />
    <template v-else>
      <div class="table-inner">
        <div class="table-scroll">
          <el-table
            :data="pagedRows"
            border
            height="100%"
            @selection-change="onSelectionChange"
            @cell-dblclick="onCellDblClick"
            @contextmenu.prevent
          >
            <el-table-column type="selection" width="48" fixed />
            <el-table-column prop="name" label="Key" width="260" fixed>
              <template #default="{ row }">
                <div class="cell-with-menu">
                  <span
                    :class="['text-ellipsis', isCellDirty(row.name, LANGUAGE.DEF) ? 'dirty' : '']"
                    :title="row.name"
                    >{{ row.name }}</span
                  >
                </div>
                <el-button
                  class="cell-menu-btn"
                  text
                  size="small"
                  @click="openKeyMenu(row, $event)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="可翻译" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.translatable ? 'success' : 'info'">{{
                  row.translatable ? '是' : '否'
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="langName(LANGUAGE.DEF)" min-width="220">
              <template #default="{ row }">
                <div class="cell-with-menu">
                  <template v-if="row.type === 'string'">
                    <template v-if="!isEditing(row.name, LANGUAGE.DEF)">
                      <span
                        :class="['text-ellipsis', isCellDirty(row.name, LANGUAGE.DEF) ? 'dirty' : '']"
                        :title="getCellValue(row, LANGUAGE.DEF)"
                        >{{ getCellValue(row, LANGUAGE.DEF) }}</span
                      >
                    </template>
                    <el-input
                      v-else
                      v-model="editable[row.name + ':' + LANGUAGE.DEF]"
                      :ref="setEditRef"
                      @change="(val: string) => onEdit(row.name, LANGUAGE.DEF, val)"
                      @keydown.enter.prevent="commitEdit()"
                      @keydown.esc="cancelEdit()"
                      @blur="stopEdit()"
                    />
                  </template>
                  <template v-else>
                    <span
                      :class="['text-ellipsis', isCellDirty(row.name, LANGUAGE.DEF) ? 'dirty' : '']"
                      :title="getCellValue(row, LANGUAGE.DEF)"
                      >{{ getCellValue(row, LANGUAGE.DEF) }}</span
                    >
                  </template>
                </div>
                <el-button
                  v-if="!isEditing(row.name, LANGUAGE.DEF) || row.type !== 'string'"
                  class="cell-menu-btn"
                  text
                  size="small"
                  @click="openCellMenu(row, LANGUAGE.DEF, $event)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column
              v-for="l in targetLangs"
              :key="l"
              :label="langHeader(l)"
              min-width="220"
            >
              <template #header>
                <div class="header-container">
                  <span>{{ langHeader(l) }}</span>
                  <el-button
                    class="header-menu-btn"
                    text
                    size="small"
                    @click="openLangHeaderMenu(l, $event)"
                  >
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                </div>
              </template>
              <template #default="{ row }">
                <div class="cell-with-menu">
                  <template v-if="row.type === 'string'">
                    <template v-if="row.translatable">
                      <template v-if="!isEditing(row.name, l)">
                        <span
                          :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']"
                          :title="getCellValue(row, l)"
                          >{{ getCellValue(row, l) || '—' }}</span
                        >
                      </template>
                      <el-input
                        v-else
                        v-model="editable[row.name + ':' + l]"
                        :ref="setEditRef"
                        @change="(val: string) => onEdit(row.name, l, val)"
                        @keydown.enter.prevent="commitEdit()"
                        @keydown.esc="cancelEdit()"
                        @blur="stopEdit()"
                      />
                    </template>
                    <template v-else>
                      <span class="muted">—</span>
                    </template>
                  </template>
                  <template v-else>
                    <span
                      :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']"
                      :title="getCellValue(row, l)"
                      >{{ getCellValue(row, l) }}</span
                    >
                  </template>
                </div>
                <el-button
                  v-if="!isEditing(row.name, l) || row.type !== 'string'"
                  class="cell-menu-btn"
                  text
                  size="small"
                  @click="openCellMenu(row, l, $event)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination">
          <el-pagination
            background
            size="small"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredRows.length"
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            @update:current-page="(v: number) => (page = v)"
            @update:page-size="
              (v: number) => {
                pageSize = v
                page = 1
              }
            "
          />
        </div>
      </div>

      <!-- Key列菜单下拉 -->
      <el-dropdown ref="keyMenu" trigger="click" :hide-on-click="true" @command="onKeyMenuCommand">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="translate">翻译此条目...</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedRow" command="restore-row" divided
              >还原此条目</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 语言表头菜单下拉 -->
      <el-dropdown
        ref="langHeaderMenu"
        trigger="click"
        :hide-on-click="true"
        @command="onLangHeaderMenuCommand"
      >
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="translate">翻译此语言...</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedLang" command="restore-lang" divided
              >还原此语言</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 单元格菜单下拉 -->
      <el-dropdown
        ref="cellMenu"
        trigger="click"
        :hide-on-click="true"
        @command="onCellMenuCommand"
      >
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="quick-translate">快速翻译</el-dropdown-item>
            <el-dropdown-item command="translate-custom">翻译...</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedCell" command="restore-cell" divided
              >还原</el-dropdown-item
            >
            <el-dropdown-item command="copy" divided>复制内容</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <ArrayEditDialog
        v-model:visible="showArrayEdit"
        :item-name="arrayEditPayload?.itemName || ''"
        :lang="arrayEditPayload?.lang || LANGUAGE.DEF"
      />

      <!-- 翻译配置弹框 -->
      <TranslateConfigDialog
        v-model="showTranslateDialog"
        :config="translateDialogConfig"
        @confirm="onTranslateConfirm"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import type { ResItem } from '@/models/resource'
import { LANGUAGE, type Language, getLanguageLabel } from '@/models/language'
import { MoreFilled } from '@element-plus/icons-vue'
import toast from '@/utils/toast'
import ArrayEditDialog from './ArrayEditDialog.vue'
import TranslateConfigDialog from './TranslateConfigDialog.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const editable = reactive<Record<string, string | undefined>>({})
const editing = ref<string | null>(null)
// 共享筛选状态来自 store
const filterText = computed({
  get: () => projectStore.tableFilterText,
  set: v => (projectStore.tableFilterText = v),
})
const selection = ref<any[]>([])

const rows = computed(() => {
  // 依赖数据版本，按需加载完成后刷新
  void projectStore.dataVersion
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return [] as ResItem[]
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  if (!fileMap) return [] as ResItem[]
  const def = fileMap.get(LANGUAGE.DEF)
  if (!def) return [] as ResItem[]
  return Array.from(def.items.values())
})

const page = ref(1)
// 从本地存储读取页面大小，默认为 20
const pageSize = ref(Number(localStorage.getItem('table-page-size')) || 20)
const filteredRows = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  let list = rows.value
  if (q) {
    list = list.filter(r => {
      const keyHit = r.name.toLowerCase().includes(q)
      const def = getCellValue(r, LANGUAGE.DEF).toLowerCase()
      return keyHit || def.includes(q)
    })
  }

  // 单选筛选逻辑
  switch (projectStore.tableFilterCurrent) {
    case 'untranslatable':
      list = list.filter(r => !r.translatable)
      break
    case 'incomplete':
      list = list.filter(r => {
        if (!r.translatable) return false
        return targetLangs.value.some(l => {
          const v = getCellValue(r, l)
          return !v || v.length === 0
        })
      })
      break
    case 'edited':
      list = list.filter(r => {
        // "已编辑" = 任一语言（默认或目标）有未保存修改
        if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return false
        const langs: Language[] = [LANGUAGE.DEF, ...targetLangs.value]
        return langs.some(l =>
          projectStore.selectedXmlData!.isDirty(projectStore.selectedXmlFile!, l, r.name)
        )
      })
      break
    // case '' 或其他值：显示全部（不筛选）
  }

  return list
})
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const targetLangs = computed<Language[]>(() =>
  configStore.config.enabledLanguages.filter(l => l !== LANGUAGE.DEF)
)

function langName(l: Language) {
  return getLanguageLabel(l, 'cn')
}
function langHeader(l: Language) {
  return getLanguageLabel(l, 'cn')
}

function getCellValue(row: ResItem, lang: Language): string {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return ''
  if (lang === LANGUAGE.DEF) {
    const v = row.valueMap.get(LANGUAGE.DEF)
    return typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : ''
  }
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const data = fileMap?.get(lang)
  const item = data?.items.get(row.name)
  const v = item?.valueMap.get(lang)
  return typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : ''
}

// 菜单相关响应式变量
const keyMenu = ref()
const langHeaderMenu = ref()
const cellMenu = ref()

// 当前菜单数据
const currentKeyRow = ref<any | null>(null)
const currentLang = ref<Language | null>(null)
const currentCellRow = ref<any | null>(null)

// 翻译配置弹框
const showTranslateDialog = ref(false)
const translateDialogConfig = ref<{
  type: 'key' | 'lang-header' | 'cell'
  title: string
  confirmText: string
  description: any
  scopeOptions: Array<{ value: string; label: string; count: number }>
  allTargetLanguages: Language[]
  defaultSelectedLanguages: Language[]
  showTargetLanguages: boolean
  languageSelectorCollapsed: boolean
  context: {
    itemName: string | null
    lang: Language | null
  }
} | null>(null)

watch(filterText, () => {
  page.value = 1
})
watch(
  () => projectStore.tableFilterCurrent,
  () => {
    page.value = 1
  }
)
watch(
  () => filteredRows.value.length,
  n => {
    projectStore.tableFilteredCount = n
  }
)
// 监听页面大小变化，保存到本地存储
watch(pageSize, newSize => {
  localStorage.setItem('table-page-size', String(newSize))
})

function keyFor(itemName: string, lang: Language) {
  return `${itemName}:${lang}`
}
function isEditing(itemName: string, lang: Language) {
  return editing.value === keyFor(itemName, lang)
}
function startEdit(itemName: string, lang: Language, type: ResItem['type']) {
  if (type !== 'string') return
  editing.value = keyFor(itemName, lang)
  editable[editing.value] = getStringValue(itemName, lang)
}
function stopEdit() {
  editing.value = null
}
function commitEdit() {
  if (!editing.value) return
  const [itemName, lang] = editing.value.split(':') as [string, Language]
  const val = editable[editing.value] ?? ''
  onEdit(itemName, lang, val)
  editing.value = null
}
function cancelEdit() {
  editing.value = null
}

function getStringValue(itemName: string, lang: Language): string {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return ''
  if (lang === LANGUAGE.DEF) {
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(LANGUAGE.DEF)
    const it = def?.items.get(itemName)
    const v = it?.valueMap.get(LANGUAGE.DEF)
    return typeof v === 'string' ? v : ''
  } else {
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const data = fileMap?.get(lang)
    const it = data?.items.get(itemName)
    const v = it?.valueMap.get(lang)
    return typeof v === 'string' ? v : ''
  }
}

function onEdit(itemName: string, lang: Language, val: string) {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  projectStore.selectedXmlData.updateItem(projectStore.selectedXmlFile, itemName, lang, val)
}

// 数组编辑
const showArrayEdit = ref(false)
const arrayEditPayload = ref<{ itemName: string; lang: Language } | null>(null)
function openArrayEditor(itemName: string, lang: Language) {
  arrayEditPayload.value = { itemName, lang }
  showArrayEdit.value = true
}

// ========== 翻译辅助函数 ==========

/**
 * 统一的翻译执行函数
 * @param items 要翻译的条目
 * @param languages 目标语言
 * @param autoUpdateTranslated 是否覆盖已有译文
 */
async function executeTranslation(
  items: Map<string, ResItem>,
  languages: Language[],
  autoUpdateTranslated = false
) {
  if (items.size === 0) {
    toast.warning('没有需要翻译的条目')
    return
  }
  if (languages.length === 0) {
    toast.warning('没有选择目标语言')
    return
  }
  // 获取文件映射数据，用于统一的未翻译过滤逻辑
  const fileMap = projectStore.selectedXmlData?.getFileData(projectStore.selectedXmlFile!)
  await translationStore.batchTranslate(items, languages, autoUpdateTranslated, fileMap)
  // batchTranslate 内部已经完成，直接提示成功
  toast.success(`批量翻译完成`)
}

/**
 * 获取指定范围的条目集合
 * @param scope 'selected' | 'missing' | 'all'
 * @param lang 目标语言（用于判断 missing）
 * @param itemName 单个条目名称（可选，用于单条目翻译）
 */
function getItemsByScope(scope: string, lang?: Language, itemName?: string): Map<string, ResItem> {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return new Map()
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const def = fileMap?.get(LANGUAGE.DEF)
  if (!def) return new Map()

  const items = new Map<string, ResItem>()
  const selectedSet = new Set(selection.value.map((r: any) => r.name))

  // 如果指定了单个条目，只处理该条目
  if (itemName) {
    const it = def.items.get(itemName)
    if (it) items.set(itemName, it)
    return items
  }

  // 遍历所有条目
  for (const [name, item] of def.items) {
    // 根据 scope 筛选
    if (scope === 'selected') {
      if (!selectedSet.has(name)) continue
    } else if (scope === 'missing' && lang) {
      const v = getCellValue(item as any, lang)
      if (v && v.length > 0) continue
    }
    // scope === 'all' 不需要额外筛选
    items.set(name, item)
  }

  return items
}

// 获取批量翻译（语言表头）场景下的条目集合，scope/selection 与 content/missing 取交集
function getLangBatchItems(
  scope: 'selected' | 'all',
  content: 'missing' | 'all',
  lang: Language
): Map<string, ResItem> {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return new Map()
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const def = fileMap?.get(LANGUAGE.DEF)
  if (!def) return new Map()

  const items = new Map<string, ResItem>()
  const selectedSet = new Set(selection.value.map((r: any) => r.name))

  for (const [name, item] of def.items) {
    if (scope === 'selected' && !selectedSet.has(name)) continue

    if (content === 'missing') {
      const v = getCellValue(item as any, lang)
      if (v && v.length > 0) continue
    }

    items.set(name, item)
  }

  return items
}

function countLangBatchItems(
  scope: 'selected' | 'all',
  content: 'missing' | 'all',
  lang: Language
): number {
  return getLangBatchItems(scope, content, lang).size
}

/**
 * 获取指定条目的目标语言列表
 * @param itemName 条目名称
 * @param mode 'missing' | 'all'
 */
function getTargetLanguagesForItem(itemName: string, mode: string): Language[] {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return []
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const def = fileMap?.get(LANGUAGE.DEF)
  if (!def) return []
  const it = def.items.get(itemName)
  if (!it) return []

  const langs = targetLangs.value
  if (mode === 'all') return langs

  // mode === 'missing'
  return langs.filter(l => {
    const v = getCellValue(it as any, l)
    return !v || v.length === 0
  })
}

// ========== 还原辅助函数 ==========

/**
 * 还原单个单元格
 */
async function restoreCell(_itemName: string, _lang: Language) {
  if (!projectStore.selectedXmlFile) return
  try {
    await projectStore.reloadSelectedFile()
    toast.success('已还原')
  } catch (e: any) {
    toast.fromError(e, '还原失败')
  }
}

/**
 * 还原整行（所有语言）
 */
async function restoreRow(_itemName: string) {
  if (!projectStore.selectedXmlFile) return
  try {
    await projectStore.reloadSelectedFile()
    toast.success('已还原')
  } catch (e: any) {
    toast.fromError(e, '还原失败')
  }
}

/**
 * 还原整个语言列
 */
async function restoreLanguage(_lang: Language) {
  if (!projectStore.selectedXmlFile) return
  try {
    await projectStore.reloadSelectedFile()
    toast.success('已还原')
  } catch (e: any) {
    toast.fromError(e, '还原失败')
  }
}

// 单元格双击进入编辑或数组弹窗（整格双击）
function onCellDblClick(row: any, column: any, _cell: HTMLElement, _event: MouseEvent) {
  const label: string = column.label
  if (!label) return
  // 识别语言
  let lang: Language | null = null
  if (label === langName(LANGUAGE.DEF)) {
    lang = LANGUAGE.DEF
  } else {
    lang = targetLangs.value.find(l => label.includes(langName(l))) || null
  }
  if (!lang) return
  if (row.type === 'string') startEdit(row.name, lang, row.type)
  else openArrayEditor(row.name, lang)
}

function setEditRef(el: any) {
  if (el && typeof el.focus === 'function') {
    // 确保渲染后自动聚焦
    requestAnimationFrame(() => {
      try {
        el.focus()
      } catch {}
    })
  }
}

function onSelectionChange(rows: any[]) {
  selection.value = rows
  projectStore.updateSelectedItems(rows.map(r => r.name))
  projectStore.tableSelectionCount = rows.length
}

// 菜单相关函数
function openKeyMenu(row: any, event: MouseEvent) {
  currentKeyRow.value = row
  const dropdown = keyMenu.value as any
  // 先关闭可能已打开的菜单，确保位置更新
  dropdown.handleClose?.()
  // 更新位置
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
  // 打开菜单
  dropdown.handleOpen()
}

function openLangHeaderMenu(lang: Language, event: MouseEvent) {
  currentLang.value = lang
  const dropdown = langHeaderMenu.value as any
  dropdown.handleClose?.()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
  dropdown.handleOpen()
}

function openCellMenu(row: any, lang: Language, event: MouseEvent) {
  currentCellRow.value = row
  currentLang.value = lang
  const dropdown = cellMenu.value as any
  dropdown.handleClose?.()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
  dropdown.handleOpen()
}

const hasEditedRow = computed(() => {
  if (!currentKeyRow.value) return false
  const langs: Language[] = [LANGUAGE.DEF, ...targetLangs.value]
  return langs.some(l => isCellDirty(currentKeyRow.value!.name, l))
})

const hasEditedLang = computed(() => {
  if (!currentLang.value) return false
  return rows.value.some(r => isCellDirty(r.name, currentLang.value!))
})

const hasEditedCell = computed(() => {
  if (!currentCellRow.value || !currentLang.value) return false
  return isCellDirty(currentCellRow.value.name, currentLang.value)
})

function onKeyMenuCommand(cmd: string) {
  if (!currentKeyRow.value) return
  const row = currentKeyRow.value

  if (cmd === 'translate') {
    // 打开翻译配置对话框，提供翻译语言选项
    const allLangs = targetLangs.value
    const missingLangs = getTargetLanguagesForItem(row.name, 'missing')

    // 先关闭菜单
    currentKeyRow.value = null

    // 准备对话框配置
    const dialogConfig = {
      type: 'key' as const,
      title: '翻译条目',
      confirmText: '开始翻译',
      description: {
        key: { label: 'Key', value: row.name },
        defaultText: { label: '默认文本', value: getCellValue(row, LANGUAGE.DEF) },
      },
      scopeOptions: [], // Key翻译不使用scopeOptions，但TypeScript要求必须有
      languageOptions: [
        { value: 'missing', label: '未翻译', count: missingLangs.length },
        { value: 'all', label: '全部', count: allLangs.length },
      ],
      allTargetLanguages: allLangs,
      defaultSelectedLanguages: allLangs, // Key翻译不需要选择语言，通过languageFilter确定
      showTargetLanguages: false, // Key翻译不显示目标语言选择
      languageSelectorCollapsed: false,
      expectedItemCount: missingLangs.length, // 默认选择未翻译时的可翻译数量
      context: {
        itemName: row.name,
        lang: null as Language | null,
        missingCount: missingLangs.length,
        allCount: allLangs.length,
      },
    }

    // 使用setTimeout确保配置设置在菜单关闭后执行
    setTimeout(() => {
      translateDialogConfig.value = dialogConfig
      showTranslateDialog.value = true
    }, 0)
  } else if (cmd === 'restore-row') {
    restoreRow(row.name)
    currentKeyRow.value = null
  }
}

function onLangHeaderMenuCommand(cmd: string) {
  if (!currentLang.value) return
  const lang = currentLang.value

  if (cmd === 'translate') {
    // 打开翻译配置对话框，提供所有翻译范围选项
    const selectedCount = countLangBatchItems('selected', 'all', lang)
    const allCount = countLangBatchItems('all', 'all', lang)
    const missingAllCount = countLangBatchItems('all', 'missing', lang)
    const missingSelectedCount = countLangBatchItems('selected', 'missing', lang)

    // 第一层：翻译范围选项（始终显示两个选项，即使selectedCount为0）
    const scopeOptions = [
      { value: 'selected', label: `已选中 (${selectedCount} 行)`, count: selectedCount },
      { value: 'all', label: `全部 (${allCount} 行)`, count: allCount },
    ]

    if (scopeOptions.length === 0) {
      toast.info('没有需要翻译的条目')
      currentLang.value = null
      return
    }

    // 第二层：翻译内容选项（仅显示有数据的选项）
    const contentOptions = [
      { value: 'missing', label: '未翻译', count: missingAllCount },
      { value: 'all', label: '全部', count: allCount },
    ]

    // 先关闭菜单
    currentLang.value = null

    // 准备对话框配置
    const dialogConfig = {
      type: 'lang-header' as const,
      title: '批量翻译',
      confirmText: '开始翻译',
      description: {
        language: {
          label: '目标语言',
          value: getLanguageLabel(lang, 'cn'),
        },
      },
      scopeOptions,
      contentOptions,
      allTargetLanguages: [lang],
      defaultSelectedLanguages: [lang],
      showTargetLanguages: false,
      languageSelectorCollapsed: true,
      expectedItemCount: allCount, // 用于按钮禁用判断
      context: {
        itemName: null as string | null,
        lang,
        selectedCount,
        missingAllCount,
        missingSelectedCount,
      },
    }

    // 使用setTimeout确保配置设置在菜单关闭后执行
    setTimeout(() => {
      translateDialogConfig.value = dialogConfig
      showTranslateDialog.value = true
    }, 0)
  } else if (cmd === 'restore-lang') {
    restoreLanguage(lang)
    currentLang.value = null
  }
}

function onCellMenuCommand(cmd: string) {
  if (!currentCellRow.value || !currentLang.value) return
  const row = currentCellRow.value
  const lang = currentLang.value

  if (cmd === 'quick-translate') {
    // 快速翻译：直接翻译当前单元格，不弹出对话框
    const items = getItemsByScope('all', undefined, row.name)
    executeTranslation(items, [lang], true)
    currentCellRow.value = null
    currentLang.value = null
  } else if (cmd === 'translate-custom') {
    // 自定义翻译：打开配置对话框
    // 先关闭菜单
    currentCellRow.value = null
    currentLang.value = null

    // 准备对话框配置
    const dialogConfig = {
      type: 'cell' as const,
      title: '翻译单元格',
      confirmText: '开始翻译',
      description: {
        key: { label: 'Key', value: row.name },
        defaultText: { label: '默认文本', value: getCellValue(row, LANGUAGE.DEF) },
        language: {
          label: '目标语言',
          value: getLanguageLabel(lang, 'cn'),
        },
      },
      scopeOptions: [], // cell翻译不使用scopeOptions
      allTargetLanguages: targetLangs.value,
      defaultSelectedLanguages: [lang],
      showTargetLanguages: false, // cell翻译不需要选择目标语言
      languageSelectorCollapsed: false,
      expectedItemCount: 1, // 只有一个单元格
      context: {
        itemName: row.name,
        lang,
      },
    }

    // 使用setTimeout确保配置设置在菜单关闭后执行
    setTimeout(() => {
      translateDialogConfig.value = dialogConfig
      showTranslateDialog.value = true
    }, 0)
  } else if (cmd === 'restore-cell') {
    restoreCell(row.name, lang)
    currentCellRow.value = null
    currentLang.value = null
  } else if (cmd === 'copy') {
    const value = getCellValue(row, lang)
    navigator.clipboard.writeText(value || '')
    toast.success('已复制')
    currentCellRow.value = null
    currentLang.value = null
  }
}

async function onTranslateConfirm(data: {
  scope: string
  content?: string
  languageFilter?: string
  languages: Language[]
  autoUpdateTranslated?: boolean
}) {
  if (!translateDialogConfig.value) return

  try {
    let items: Map<string, ResItem>
    let languages: Language[]
    let autoUpdateTranslated = false

    if (translateDialogConfig.value.type === 'key') {
      // Key 列菜单：翻译指定条目
      const itemName = translateDialogConfig.value.context.itemName
      if (!itemName) return
      items = getItemsByScope('all', undefined, itemName)
      // Key翻译通过languageFilter确定目标语言
      const allLangs = targetLangs.value
      const missingLangs = getTargetLanguagesForItem(itemName, 'missing')
      languages = data.languageFilter === 'missing' ? missingLangs : allLangs
      autoUpdateTranslated = data.autoUpdateTranslated ?? data.languageFilter === 'all'
    } else if (translateDialogConfig.value.type === 'lang-header') {
      // 语言表头菜单：翻译指定语言的多个条目
      const lang = translateDialogConfig.value.context.lang
      if (!lang) return
      // scope与content需要取交集
      const scope = (data.scope as 'selected' | 'all') || 'all'
      const content = (data.content as 'missing' | 'all') || 'all'
      items = getLangBatchItems(scope, content, lang)
      languages = [lang]
      autoUpdateTranslated = data.autoUpdateTranslated ?? content === 'all'
    } else {
      // cell：单元格菜单
      const itemName = translateDialogConfig.value.context.itemName
      if (!itemName) return
      items = getItemsByScope('all', undefined, itemName)
      languages = data.languages
      autoUpdateTranslated = data.autoUpdateTranslated ?? true
    }

    // 关闭对话框
    showTranslateDialog.value = false
    translateDialogConfig.value = null

    // 执行翻译
    await executeTranslation(items, languages, autoUpdateTranslated)
  } catch (e: any) {
    toast.fromError(e, '翻译失败')
  }
}

function isCellDirty(itemName: string, lang: Language): boolean {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return false
  return projectStore.selectedXmlData.isDirty(projectStore.selectedXmlFile, lang, itemName)
}
</script>

<style scoped>
.table-wrap {
  height: 100%;
}
.table-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.table-scroll {
  flex: 1;
  min-height: 0;
}
:deep(.el-table) {
  --el-table-header-bg-color: var(--el-fill-color-light);
}
.pagination {
  padding: 6px 8px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color);
  flex-wrap: wrap;
  row-gap: 6px;
}
.dirty {
  color: var(--el-color-danger);
}

.header-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cell-with-menu {
  position: relative;
  width: 100%;
}

.cell-with-menu .text-ellipsis,
.cell-with-menu input {
  max-width: calc(100% - 30px);
}

.cell-menu-btn,
.header-menu-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

:deep(.el-table__cell) {
  position: relative;
}

:deep(.el-table__cell:hover .cell-menu-btn),
:deep(.el-table__cell:hover .header-menu-btn) {
  opacity: 1;
}
</style>
