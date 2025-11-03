<template>
  <div class="table-wrap">
    <el-empty v-if="!projectStore.selectedXmlData || !projectStore.selectedXmlFile" description="请选择左侧 XML 文件" />
    <template v-else>
      <el-table :data="rows" border height="100%" @cell-contextmenu="onCellContextMenu">
        <el-table-column prop="name" label="Key" width="260" fixed />
        <el-table-column :label="langName(Language.DEF)" min-width="220">
          <template #default="{ row }">
            <span class="text-ellipsis" :title="getCellValue(row, Language.DEF)">{{ getCellValue(row, Language.DEF) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-for="l in targetLangs" :key="l" :label="langName(l)" min-width="220">
          <template #default="{ row }">
            <template v-if="row.type === 'string'">
              <el-input v-model="editable[row.name + ':' + l]" size="small" @change="(val: string) => onEdit(row.name, l, val)" :placeholder="getCellValue(row, l) || '—'" />
            </template>
            <template v-else>
              <span class="muted">[字符串数组]</span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-dropdown ref="ctxMenu" trigger="contextmenu" :hide-on-click="true" @command="onMenu">
        <span />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="ai">AI 翻译此单元格</el-dropdown-item>
            <el-dropdown-item divided command="copy">复制内容</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const editable = reactive<Record<string, string | undefined>>({})

const rows = computed(() => {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return [] as ResItem[]
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  if (!fileMap) return [] as ResItem[]
  const def = fileMap.get(Language.DEF)
  if (!def) return [] as ResItem[]
  return Array.from(def.items.values())
})

const targetLangs = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langName(l: Language) { return getLanguageName(l, 'cn') }

function getCellValue(row: ResItem, lang: Language): string {
  const v = row.valueMap.get(lang)
  if (Array.isArray(v)) return v.join(', ')
  return v ?? ''
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

</script>

<style scoped>
.table-wrap { height: 100%; }
:deep(.el-table) { --el-table-header-bg-color: var(--ep-fill-color-light); }
</style>
