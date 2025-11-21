<template>
  <div class="table-wrap">
    <el-empty v-if="!projectStore.selectedXmlData || !projectStore.selectedXmlFile" description="请选择左侧 XML 文件" />
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
                  <span :class="['text-ellipsis', isCellDirty(row.name, Language.DEF) ? 'dirty' : '']" :title="row.name">{{ row.name }}</span>
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
                <el-tag size="small" :type="row.translatable ? 'success' : 'info'">{{ row.translatable ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="langName(Language.DEF)" min-width="220">
              <template #default="{ row }">
                <div class="cell-with-menu">
                  <template v-if="!isEditing(row.name, Language.DEF)">
                    <span :class="['text-ellipsis', isCellDirty(row.name, Language.DEF) ? 'dirty' : '']" :title="getCellValue(row, Language.DEF)">{{ getCellValue(row, Language.DEF) }}</span>
                  </template>
                  <el-input
                    v-else-if="row.type==='string'"
                    v-model="editable[row.name + ':' + Language.DEF]"
                    :ref="setEditRef"
                    @change="(val: string) => onEdit(row.name, Language.DEF, val)"
                    @keydown.enter.prevent="commitEdit()"
                    @keydown.esc="cancelEdit()"
                    @blur="stopEdit()"
                  />
                  <span v-if="!isEditing(row.name, Language.DEF) && row.type!=='string'" :class="['text-ellipsis', isCellDirty(row.name, Language.DEF) ? 'dirty' : '']">{{ getCellValue(row, Language.DEF) }}</span>
                </div>
                <el-button
                  v-if="!isEditing(row.name, Language.DEF) || row.type!=='string'"
                  class="cell-menu-btn"
                  text
                  size="small"
                  @click="openCellMenu(row, Language.DEF, $event)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column v-for="l in targetLangs" :key="l" :label="langHeader(l)" min-width="220">
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
                        <span :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']" :title="getCellValue(row, l)">{{ getCellValue(row, l) || '—' }}</span>
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
                    <span :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']" :title="getCellValue(row, l)">{{ getCellValue(row, l) }}</span>
                  </template>
                </div>
                <el-button
                  v-if="!isEditing(row.name, l) || row.type!=='string'"
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
            :page-sizes="[10,20,50,100]"
            @update:current-page="(v:number)=>page=v"
            @update:page-size="(v:number)=>{pageSize=v; page=1}"
          />
        </div>
      </div>

      <!-- Key列菜单下拉 -->
      <el-dropdown ref="keyMenu" trigger="click" :hide-on-click="true" @command="onKeyMenuCommand">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="translate-missing">翻译此条目-未翻译</el-dropdown-item>
            <el-dropdown-item command="translate-all">翻译此条目-所有</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedRow" command="restore-row" divided>还原此条目</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 语言表头菜单下拉 -->
      <el-dropdown ref="langHeaderMenu" trigger="click" :hide-on-click="true" @command="onLangHeaderMenuCommand">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="translate-selected">翻译此语言-已选中</el-dropdown-item>
            <el-dropdown-item command="translate-missing">翻译此语言-未翻译</el-dropdown-item>
            <el-dropdown-item command="translate-all">翻译此语言-所有</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedLang" command="restore-lang" divided>还原此语言</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 单元格菜单下拉 -->
      <el-dropdown ref="cellMenu" trigger="click" :hide-on-click="true" @command="onCellMenuCommand">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="quick-translate">快速翻译</el-dropdown-item>
            <el-dropdown-item command="translate-custom">翻译...</el-dropdown-item>
            <el-dropdown-item v-if="hasEditedCell" command="restore-cell" divided>还原</el-dropdown-item>
            <el-dropdown-item command="copy" divided>复制内容</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <ArrayEditDialog v-model:visible="showArrayEdit" :item-name="arrayEditPayload?.itemName || ''" :lang="arrayEditPayload?.lang || Language.DEF" />

      <!-- 翻译配置弹框 -->
      <TranslateConfigDialog
        v-model="showTranslateDialog"
        :type="translateDialogData.type"
        :title="translateDialogData.title"
        :confirm-text="translateDialogData.confirmText"
        :description="translateDialogData.description"
        :scope-options="translateDialogData.scopeOptions"
        :all-target-languages="translateDialogData.allTargetLanguages"
        :default-selected-languages="translateDialogData.defaultSelectedLanguages"
        :show-target-languages="translateDialogData.showTargetLanguages"
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
import { Language, getLanguageName, getLanguageInfo } from '@/models/language'
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
const filterText = computed({ get: () => projectStore.tableFilterText, set: v => projectStore.tableFilterText = v })
const selection = ref<any[]>([])

const rows = computed(() => {
  // 依赖数据版本，按需加载完成后刷新
  void projectStore.dataVersion
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return [] as ResItem[]
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  if (!fileMap) return [] as ResItem[]
  const def = fileMap.get(Language.DEF)
  if (!def) return [] as ResItem[]
  return Array.from(def.items.values())
})

const page = ref(1)
const pageSize = ref(20)
const filteredRows = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  let list = rows.value
  if (q) {
    list = list.filter(r => {
      const keyHit = r.name.toLowerCase().includes(q)
      const def = getCellValue(r, Language.DEF).toLowerCase()
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
        const langs: Language[] = [Language.DEF, ...targetLangs.value]
        return langs.some(l => projectStore.selectedXmlData!.isDirty(projectStore.selectedXmlFile!, l, r.name))
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

const targetLangs = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langName(l: Language) { return getLanguageName(l, 'cn') }
function langHeader(l: Language) {
  if (l === Language.DEF) return getLanguageName(l, 'cn')
  const info = getLanguageInfo(l)
  return `${getLanguageName(l, 'cn')} (${info.androidCode})`
}

function getCellValue(row: ResItem, lang: Language): string {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return ''
  if (lang === Language.DEF) {
    const v = row.valueMap.get(Language.DEF)
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
const translateDialogData = reactive({
  type: 'key' as 'key' | 'lang-header' | 'cell',
  title: '',
  confirmText: '',
  description: null as any,
  scopeOptions: [] as Array<{ value: string; label: string; count: number }>,
  allTargetLanguages: [] as Language[],
  defaultSelectedLanguages: [] as Language[],
  showTargetLanguages: true
})

watch(filterText, () => { page.value = 1 })
watch(() => projectStore.tableFilterCurrent, () => { page.value = 1 })
watch(() => filteredRows.value.length, (n) => { projectStore.tableFilteredCount = n })

function keyFor(itemName: string, lang: Language) { return `${itemName}:${lang}` }
function isEditing(itemName: string, lang: Language) { return editing.value === keyFor(itemName, lang) }
function startEdit(itemName: string, lang: Language, type: ResItem['type']) {
  if (type !== 'string') return
  editing.value = keyFor(itemName, lang)
  editable[editing.value] = getStringValue(itemName, lang)
}
function stopEdit() { editing.value = null }
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
  if (lang === Language.DEF) {
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(Language.DEF)
    const it = def?.items.get(itemName)
    const v = it?.valueMap.get(Language.DEF)
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

async function translateForLanguage(lang: Language, mode: 'selected' | 'missing' | 'all') {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const def = fileMap?.get(Language.DEF)
  if (!def) return
  const selectedSet = new Set(selection.value.map((r: any) => r.name))
  const items = new Map<string, ResItem>()
  for (const [name, item] of def.items) {
    if (mode === 'selected' && !selectedSet.has(name)) continue
    if (mode === 'missing') {
      const v = getCellValue(item as any, lang)
      if (v && v.length > 0) continue
    }
    items.set(name, item)
  }
  await translationStore.startTranslation(items, [lang])
  const p = translationStore.progress
  toast.success(`翻译完成：${p.completed} 成功，${p.failed} 失败`)
}

async function translateForItem(itemName: string, mode: 'missing' | 'all') {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const def = fileMap?.get(Language.DEF)
  if (!def) return
  const it = def.items.get(itemName)
  if (!it) return
  const items = new Map<string, ResItem>([[itemName, it]])
  const langs = configStore.config.enabledLanguages.filter(l => l !== Language.DEF)
  const target = langs.filter(l => {
    if (mode === 'all') return true
    const v = getCellValue(it as any, l)
    return !v || v.length === 0
  })
  if (target.length === 0) {
    toast.info('无可翻译目标语言')
    return
  }
  await translationStore.startTranslation(items, target)
  const p = translationStore.progress
  toast.success(`翻译完成：${p.completed} 成功，${p.failed} 失败`)
}

// 单元格双击进入编辑或数组弹窗（整格双击）
function onCellDblClick(row: any, column: any, _cell: HTMLElement, _event: MouseEvent) {
  const label: string = column.label
  if (!label) return
  // 识别语言
  let lang: Language | null = null
  if (label === langName(Language.DEF)) {
    lang = Language.DEF
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
      try { el.focus() } catch {}
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
  dropdown.handleOpen()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
}

function openLangHeaderMenu(lang: Language, event: MouseEvent) {
  currentLang.value = lang
  const dropdown = langHeaderMenu.value as any
  dropdown.handleOpen()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
}

function openCellMenu(row: any, lang: Language, event: MouseEvent) {
  currentCellRow.value = row
  const dropdown = cellMenu.value as any
  dropdown.handleOpen()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
}

const hasEditedRow = computed(() => {
  if (!currentKeyRow.value) return false
  const langs: Language[] = [Language.DEF, ...targetLangs.value]
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
  if (cmd === 'translate-missing' || cmd === 'translate-all') {
    // TODO: 实现翻译
    toast.info('功能开发中')
  } else if (cmd === 'restore-row') {
    // TODO: 实现还原
    toast.info('功能开发中')
  }
  currentKeyRow.value = null
}

function onLangHeaderMenuCommand(cmd: string) {
  if (!currentLang.value) return
  if (cmd === 'translate-selected' || cmd === 'translate-missing' || cmd === 'translate-all') {
    // TODO: 实现翻译
    toast.info('功能开发中')
  } else if (cmd === 'restore-lang') {
    // TODO: 实现还原
    toast.info('功能开发中')
  }
  currentLang.value = null
}

function onCellMenuCommand(cmd: string) {
  if (!currentCellRow.value || !currentLang.value) return
  if (cmd === 'quick-translate') {
    // TODO: 实现快速翻译
    toast.info('功能开发中')
  } else if (cmd === 'translate-custom') {
    // TODO: 实现自定义翻译
    toast.info('功能开发中')
  } else if (cmd === 'restore-cell') {
    // TODO: 实现还原
    toast.info('功能开发中')
  } else if (cmd === 'copy') {
    const value = getCellValue(currentCellRow.value, currentLang.value)
    navigator.clipboard.writeText(value || '')
    toast.success('已复制')
  }
  currentCellRow.value = null
  currentLang.value = null
}

function onTranslateConfirm(_data: { scope: string; languages: Language[] }) {
  // TODO: 实现翻译逻辑
  toast.info('功能开发中')
  showTranslateDialog.value = false
}

function isCellDirty(itemName: string, lang: Language): boolean {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return false
  return projectStore.selectedXmlData.isDirty(projectStore.selectedXmlFile, lang, itemName)
}

</script>

<style scoped>
.table-wrap { height: 100%; }
.table-inner { height: 100%; display: flex; flex-direction: column; }
.table-scroll { flex: 1; min-height: 0; }
:deep(.el-table) { --el-table-header-bg-color: var(--el-fill-color-light); }
.pagination { padding: 6px 8px; border-top: 1px solid var(--el-border-color); background: var(--el-bg-color); }
.table-toolbar { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--el-border-color); flex-wrap: wrap; row-gap: 6px; }
.dirty { color: var(--el-color-danger); }

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
