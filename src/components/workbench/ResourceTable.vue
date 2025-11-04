<template>
  <div class="table-wrap">
    <el-empty v-if="!projectStore.selectedXmlData || !projectStore.selectedXmlFile" description="请选择左侧 XML 文件" />
    <template v-else>
      <div class="table-inner">
        <div class="table-toolbar">
          <el-input v-model="filterText" size="small" clearable placeholder="搜索 Key / 默认文本" style="max-width: 280px" />
          <el-divider direction="vertical" />
          <el-popover placement="bottom-start" trigger="click">
            <template #reference>
              <el-button size="small">筛选</el-button>
            </template>
            <div style="display:flex; flex-direction:column; gap:6px; min-width:180px;">
              <el-checkbox v-model="filterIncomplete">仅未完成翻译</el-checkbox>
              <el-checkbox v-model="filterUntranslatable">仅不可翻译</el-checkbox>
            </div>
          </el-popover>
          <div class="toolbar-spacer"></div>
          <el-tag size="small" type="info">筛选: {{ filteredRows.length }}</el-tag>
          <el-tag size="small" type="success" style="margin-left:6px;">选中: {{ selection.length }}</el-tag>
        </div>
        <div class="table-scroll">
          <el-table :data="pagedRows" border height="100%" @cell-contextmenu="onCellContextMenu" @cell-dblclick="onCellDblClick" @selection-change="onSelectionChange">
            <el-table-column type="selection" width="48" fixed />
            <el-table-column prop="name" label="Key" width="260" fixed />
            <el-table-column label="可翻译" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.translatable ? 'success' : 'info'">{{ row.translatable ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="langName(Language.DEF)" min-width="220">
              <template #default="{ row }">
                <span v-if="!isEditing(row.name, Language.DEF)" :class="['text-ellipsis', isCellDirty(row.name, Language.DEF) ? 'dirty' : '']" :title="getCellValue(row, Language.DEF)">{{ getCellValue(row, Language.DEF) }}</span>
                <el-input
                  v-else-if="row.type==='string'"
                  v-model="editable[row.name + ':' + Language.DEF]"
                  size="small"
                  :ref="setEditRef"
                  @change="(val: string) => onEdit(row.name, Language.DEF, val)"
                  @keydown.enter.prevent="commitEdit()"
                  @keydown.esc="cancelEdit()"
                  @blur="stopEdit()"
                />
                <span v-else :class="['text-ellipsis', isCellDirty(row.name, Language.DEF) ? 'dirty' : '']">{{ getCellValue(row, Language.DEF) }}</span>
              </template>
            </el-table-column>
            <el-table-column v-for="l in targetLangs" :key="l" :label="langHeader(l)" min-width="220">
              <template #default="{ row }">
                <template v-if="row.type === 'string'">
                  <template v-if="row.translatable">
                    <span v-if="!isEditing(row.name, l)" :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']" :title="getCellValue(row, l)">{{ getCellValue(row, l) || '—' }}</span>
                    <el-input v-else v-model="editable[row.name + ':' + l]" size="small" :ref="setEditRef" @change="(val: string) => onEdit(row.name, l, val)" @keydown.enter.prevent="commitEdit()" @keydown.esc="cancelEdit()" @blur="stopEdit()" />
                  </template>
                  <template v-else>
                    <span class="muted">—</span>
                  </template>
                </template>
                <template v-else>
                  <span :class="['text-ellipsis', isCellDirty(row.name, l) ? 'dirty' : '']" :title="getCellValue(row, l)">{{ getCellValue(row, l) }}</span>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination">
          <el-pagination
            background
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

      <el-dropdown ref="ctxMenu" trigger="contextmenu" :hide-on-click="true" @command="onMenu">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="ai">AI 翻译此单元格</el-dropdown-item>
            <el-dropdown-item divided command="copy">复制内容</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <ArrayEditDialog v-model:visible="showArrayEdit" :item-name="arrayEditPayload?.itemName || ''" :lang="arrayEditPayload?.lang || Language.DEF" />
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
import { ElMessage } from 'element-plus'
import ArrayEditDialog from './ArrayEditDialog.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const editable = reactive<Record<string, string | undefined>>({})
const editing = ref<string | null>(null)
const filterText = ref('')
const filterIncomplete = ref(false)
const filterUntranslatable = ref(false)
const selection = ref<any[]>([])
const editRef = ref<any>(null)

const rows = computed(() => {
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
  if (filterUntranslatable.value) {
    list = list.filter(r => !r.translatable)
  }
  if (filterIncomplete.value) {
    list = list.filter(r => {
      if (!r.translatable) return false
      return targetLangs.value.some(l => {
        const v = getCellValue(r, l)
        return !v || v.length === 0
      })
    })
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

watch(filterText, () => { page.value = 1 })
watch([filterIncomplete, filterUntranslatable], () => { page.value = 1 })

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

const ctxMenu = ref()
const ctxPayload = ref<{ itemName: string; lang: Language; value: string } | null>(null)

function onCellContextMenu(row: any, column: any, _cell: HTMLElement, event: MouseEvent) {
  // Only for target columns
  const label: string = column.label
  const lang = targetLangs.value.find(l => label.includes(getLanguageName(l, 'cn')))
  if (!lang) return
  ctxPayload.value = { itemName: row.name, lang, value: getCellValue(row, lang) }
  // show dropdown at cursor
  const dropdown = (ctxMenu.value as any)
  dropdown.handleOpen()
  const el = dropdown.$el as HTMLElement
  el.style.position = 'fixed'
  el.style.left = event.clientX + 'px'
  el.style.top = event.clientY + 'px'
}

async function onMenu(cmd: string) {
  if (!ctxPayload.value) return
  const { itemName, lang, value } = ctxPayload.value
  if (cmd === 'copy') {
    try {
      await navigator.clipboard.writeText(value || '')
      ElMessage.success('已复制')
    } catch {}
  } else if (cmd === 'ai') {
    try {
      await translationStore.translateSingle(itemName, lang)
      ElMessage.success('已翻译')
    } catch (e: any) {
      ElMessage.error(e?.message || '翻译失败')
    }
  }
}

// 数组编辑
const showArrayEdit = ref(false)
const arrayEditPayload = ref<{ itemName: string; lang: Language } | null>(null)
function openArrayEditor(itemName: string, lang: Language) {
  arrayEditPayload.value = { itemName, lang }
  showArrayEdit.value = true
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
.pagination { padding: 12px; border-top: 1px solid var(--el-border-color); background: var(--el-bg-color); }
.table-toolbar { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--el-border-color); }
.dirty { color: var(--el-color-danger); }
</style>
