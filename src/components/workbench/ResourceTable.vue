<template>
  <div class="table-wrap">
    <el-empty v-if="!projectStore.selectedXmlData || !projectStore.selectedXmlFile" description="请选择左侧 XML 文件" />
    <template v-else>
      <div class="table-inner">
        <div class="table-scroll">
          <el-table :data="pagedRows" border height="100%" @cell-contextmenu="onCellContextMenu">
            <el-table-column prop="name" label="Key" width="260" fixed />
            <el-table-column label="可翻译" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.translatable ? 'success' : 'info'">{{ row.translatable ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="langName(Language.DEF)" min-width="220">
              <template #default="{ row }">
                <span v-if="!isEditing(row.name, Language.DEF)" class="text-ellipsis" :title="getCellValue(row, Language.DEF)" @dblclick="startEdit(row.name, Language.DEF, row.type)">{{ getCellValue(row, Language.DEF) }}</span>
                <el-input
                  v-else-if="row.type==='string'"
                  v-model="editable[row.name + ':' + Language.DEF]"
                  size="small"
                  @change="(val: string) => onEdit(row.name, Language.DEF, val)"
                  @blur="stopEdit()"
                />
                <span v-else class="text-ellipsis" @dblclick="openArrayEditor(row.name, Language.DEF)">{{ getCellValue(row, Language.DEF) }}</span>
              </template>
            </el-table-column>
            <el-table-column v-for="l in targetLangs" :key="l" :label="langName(l)" min-width="220">
              <template #default="{ row }">
                <template v-if="row.type === 'string'">
                  <template v-if="row.translatable">
                    <span v-if="!isEditing(row.name, l)" class="text-ellipsis" :title="getCellValue(row, l)" @dblclick="startEdit(row.name, l, row.type)">{{ getCellValue(row, l) || '—' }}</span>
                    <el-input v-else v-model="editable[row.name + ':' + l]" size="small" @change="(val: string) => onEdit(row.name, l, val)" @blur="stopEdit()" />
                  </template>
                  <template v-else>
                    <span class="muted">—</span>
                  </template>
                </template>
                <template v-else>
                  <span class="text-ellipsis" :title="getCellValue(row, l)" @dblclick="openArrayEditor(row.name, l)">{{ getCellValue(row, l) }}</span>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="pagination">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next, jumper"
            :total="rows.length"
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
import { computed, reactive, ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import type { ResItem } from '@/models/resource'
import { Language, getLanguageName } from '@/models/language'
import { ElMessage } from 'element-plus'
import ArrayEditDialog from './ArrayEditDialog.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const editable = reactive<Record<string, string | undefined>>({})
const editing = ref<string | null>(null)

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
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

const targetLangs = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langName(l: Language) { return getLanguageName(l, 'cn') }

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

function keyFor(itemName: string, lang: Language) { return `${itemName}:${lang}` }
function isEditing(itemName: string, lang: Language) { return editing.value === keyFor(itemName, lang) }
function startEdit(itemName: string, lang: Language, type: ResItem['type']) {
  if (type !== 'string') return
  editing.value = keyFor(itemName, lang)
  editable[editing.value] = getStringValue(itemName, lang)
}
function stopEdit() { editing.value = null }

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

</script>

<style scoped>
.table-wrap { height: 100%; }
.table-inner { height: 100%; display: flex; flex-direction: column; }
.table-scroll { flex: 1; min-height: 0; }
:deep(.el-table) { --el-table-header-bg-color: var(--ep-fill-color-light); }
.pagination { padding: 8px 8px 0; border-top: 1px solid var(--ep-border-color); background: var(--ep-bg-color); }
</style>
