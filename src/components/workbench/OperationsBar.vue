<template>
  <div class="toolbar ops">
    <el-button size="small" @click="reloadFile" :disabled="!projectStore.selectedXmlFile">重新加载文件</el-button>
    <el-button size="small" type="success" @click="saveCurrentFile" :disabled="!projectStore.selectedXmlFile">保存当前文件</el-button>
    <el-divider direction="vertical" />
    <!-- 搜索 / 筛选 放到与操作同一行 -->
    <el-input v-model="projectStore.tableFilterText" size="small" clearable placeholder="搜索 Key / 默认文本" style="max-width: 320px">
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-checkbox v-model="projectStore.tableFilterIncomplete" size="small" border>未完成</el-checkbox>
    <el-checkbox v-model="projectStore.tableFilterUntranslatable" size="small" border>不可翻译</el-checkbox>
    <el-checkbox v-model="projectStore.tableFilterEdited" size="small" border>已编辑</el-checkbox>
    <el-divider direction="vertical" />
    <el-button size="small" @click="langDialogVisible = true">目标语言{{ selectedTargetCount ? `(${selectedTargetCount})` : '' }}</el-button>
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
    <el-button size="small" type="primary" @click="batchDialogVisible = true" :disabled="!canTranslate || isTranslating">
      批量翻译
    </el-button>
    <div class="toolbar-spacer"></div>
    <!-- 统计标签移至同一行显示 -->
    <el-tag size="small" type="info">筛选: {{ projectStore.tableFilteredCount }}</el-tag>
    <el-tag size="small" type="success" style="margin-left:6px;">选中: {{ projectStore.tableSelectionCount }}</el-tag>
    <template v-if="isTranslating">
      <el-divider direction="vertical" />
      <el-progress :percentage="progress.percentage" :stroke-width="6" style="width: 160px" />
      <span class="muted" style="margin-left:8px;">{{ progress.completed }}/{{ progress.total }}，失败 {{ progress.failed }}</span>
    </template>
  </div>
  <el-dialog v-model="batchDialogVisible" title="批量翻译" width="520px">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="目标语言数量">{{ selectedLangs.length }}</el-descriptions-item>
      <el-descriptions-item label="选中条目数">
        {{ projectStore.selectedItemNames.length || '（未选择，默认全部）' }}
      </el-descriptions-item>
    </el-descriptions>
    <div style="margin-top:12px;">
      <el-checkbox v-model="updateExisting">更新已翻译部分</el-checkbox>
    </div>
    <template #footer>
      <el-button @click="batchDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchTranslate">开始翻译</el-button>
    </template>
  </el-dialog>
 </template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import { Language, getLanguageName, getLanguageInfo } from '@/models/language'
import { Search } from '@element-plus/icons-vue'
import type { ResItem } from '@/models/resource'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const selectedLangs = ref<Language[]>([])
const selectedTargetCount = computed(() => configStore.config.targetLanguages.length)
const langDialogVisible = ref(false)
const batchDialogVisible = ref(false)
const updateExisting = ref(true)

// removed unused fileStats to satisfy TS build

const allTargetLanguages = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langLabel(l: Language) { const info = getLanguageInfo(l); return `${getLanguageName(l, 'cn')} (${info.androidCode})` }

const canTranslate = computed(() => {
  const hasFile = !!(projectStore.selectedXmlData && projectStore.selectedXmlFile)
  const targets = configStore.config.targetLanguages
  return hasFile && targets.length > 0
})
const isTranslating = computed(() => translationStore.isTranslating)
const progress = computed(() => translationStore.progress)

watch(langDialogVisible, (v) => {
  if (v) {
    // 打开时同步目标语言配置（与启用语言分离）
    selectedLangs.value = configStore.config.targetLanguages.slice()
  }
})

async function reloadFile() {
  try {
    const loading = ElLoading.service({ lock: true, text: '重载中...' })
    await projectStore.reloadSelectedFile()
    loading.close()
    toast.success('文件已重新加载')
  } catch (e: any) {
    toast.fromError(e, '重载失败')
  }
}

async function saveCurrentFile() {
  if (!projectStore.selectedXmlFile) return
  try {
    const loading = ElLoading.service({ lock: true, text: '保存中...' })
    await projectStore.saveSelectedFile()
    loading.close()
    toast.success('已保存当前文件')
  } catch (e: any) {
    toast.fromError(e, '保存失败')
  }
}

async function confirmBatchTranslate() {
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
    const prev = configStore.config.autoRetry
    configStore.update('autoRetry', updateExisting.value)
    try {
      await translationStore.startTranslation(items, selectedLangs.value)
    } finally {
      configStore.update('autoRetry', prev)
    }
    const p = translationStore.progress
    toast.success(`批量翻译完成：${p.completed} 成功，${p.failed} 失败`)
    batchDialogVisible.value = false
  } catch (e: any) {
    toast.fromError(e, '翻译失败')
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
  // 仅更新“目标语言”，不影响“启用语言”（表格列）
  configStore.update('targetLanguages', selectedLangs.value.slice())
  langDialogVisible.value = false
}
</script>

<style scoped>
.ops { padding: 8px 12px; border-bottom: 1px solid var(--ep-border-color); flex-wrap: wrap; row-gap: 6px; }
.ops :deep(.el-checkbox) { margin-right: 6px; }
.ops :deep(.el-checkbox:last-child) { margin-right: 0; }
</style>
