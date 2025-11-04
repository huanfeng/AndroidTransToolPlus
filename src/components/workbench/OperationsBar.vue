<template>
  <div class="toolbar ops">
    <el-button size="small" @click="reloadFile" :disabled="!projectStore.selectedXmlFile">
      重新加载文件
    </el-button>
    <el-button size="small" type="success" @click="saveCurrentFile" :disabled="!projectStore.selectedXmlFile">
      保存当前文件
    </el-button>
    <el-divider direction="vertical" />
    <el-button size="small" @click="langDialogVisible = true">目标语言{{ selectedLangs.length ? `(${selectedLangs.length})` : '' }}</el-button>
    <el-dialog v-model="langDialogVisible" title="选择目标语言" width="520px">
      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <el-button size="small" @click="selectAllLangs">全选</el-button>
        <el-button size="small" @click="clearAllLangs">全不选</el-button>
        <el-button size="small" @click="invertLangs">反选</el-button>
      </div>
      <el-checkbox-group v-model="selectedLangs" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
        <el-checkbox v-for="l in allTargetLanguages" :key="l" :label="l">{{ langLabel(l) }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="langDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyLangSelection">应用</el-button>
      </template>
    </el-dialog>
    <el-button size="small" type="primary" @click="batchTranslate" :disabled="!canTranslate || isTranslating">
      批量翻译
    </el-button>
    <div class="toolbar-spacer"></div>
    <template v-if="isTranslating">
      <el-divider direction="vertical" />
      <el-progress :percentage="progress.percentage" :stroke-width="6" style="width: 160px" />
      <span class="muted" style="margin-left:8px;">{{ progress.completed }}/{{ progress.total }}，失败 {{ progress.failed }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import { Language, getLanguageName, getLanguageInfo } from '@/models/language'
import type { ResItem } from '@/models/resource'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const selectedLangs = ref<Language[]>([])
const langDialogVisible = ref(false)

const fileStats = computed(() => projectStore.selectedFileStats)

const allTargetLanguages = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langName(l: Language) { return getLanguageName(l, 'cn') }
function langLabel(l: Language) { const info = getLanguageInfo(l); return `${getLanguageName(l, 'cn')} (${info.androidCode})` }

const canTranslate = computed(() => projectStore.selectedXmlData && projectStore.selectedXmlFile && selectedLangs.value.length > 0)
const isTranslating = computed(() => translationStore.isTranslating)
const progress = computed(() => translationStore.progress)

watch(langDialogVisible, (v) => {
  if (v) {
    // 打开时同步当前配置
    selectedLangs.value = configStore.config.enabledLanguages.filter(l => l !== Language.DEF)
  }
})

async function reloadFile() {
  try {
    const loading = ElLoading.service({ lock: true, text: '重载中...' })
    await projectStore.reloadSelectedFile()
    loading.close()
    ElMessage.success('文件已重新加载')
  } catch (e: any) {
    ElMessage.error(e?.message || '重载失败')
  }
}

async function saveCurrentFile() {
  if (!projectStore.selectedXmlFile) return
  try {
    const loading = ElLoading.service({ lock: true, text: '保存中...' })
    await projectStore.saveSelectedFile()
    loading.close()
    ElMessage.success('已保存当前文件')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function batchTranslate() {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  try {
    // 仅对当前文件，且仅对表格选中的条目进行翻译（若有选中）
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(Language.DEF)
    if (!def) throw new Error('Default language not available')
    const selectedSet = new Set(projectStore.selectedItemNames || [])
    const items = new Map<string, ResItem>()
    for (const [name, item] of def.items) {
      if (selectedSet.size === 0 || selectedSet.has(name)) {
        items.set(name, item)
      }
    }
    await translationStore.startTranslation(items, selectedLangs.value)
    ElMessage.success('批量翻译完成')
  } catch (e: any) {
    ElMessage.error(e?.message || '翻译失败')
  }
}

function selectAllLangs() {
  selectedLangs.value = allTargetLanguages.value.slice()
}
function clearAllLangs() {
  selectedLangs.value = []
}
function invertLangs() {
  const set = new Set(selectedLangs.value)
  selectedLangs.value = allTargetLanguages.value.filter(l => !set.has(l))
}
function applyLangSelection() {
  // 更新配置以便表格列记忆
  const langs = [Language.DEF, ...selectedLangs.value]
  configStore.update('enabledLanguages', langs)
  langDialogVisible.value = false
}
</script>

<style scoped>
.ops { padding: 8px 12px; border-bottom: 1px solid var(--ep-border-color); }
</style>
