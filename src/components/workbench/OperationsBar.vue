<template>
  <div class="toolbar ops">
    <el-button @click="reloadFile" :disabled="!projectStore.selectedXmlFile">重新加载文件</el-button>
    <el-button type="primary" @click="batchDialogVisible = true" :disabled="!canTranslate">
      <el-icon style="margin-right:4px;"><MessageBox /></el-icon>
      批量翻译
    </el-button>
    <el-button type="success" @click="saveCurrentFile" :disabled="!projectStore.selectedXmlFile">保存当前文件</el-button>
    <el-divider direction="vertical" />
    <!-- 搜索 / 筛选 放到与操作同一行 -->
    <el-input v-model="projectStore.tableFilterText" clearable placeholder="搜索 Key / 默认文本" style="max-width: 320px">
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-radio-group v-model="projectStore.tableFilterCurrent" style="margin-left: 8px;">
      <el-radio-button value="">全部</el-radio-button>
      <el-radio-button value="incomplete">未完成</el-radio-button>
      <el-radio-button value="untranslatable">不可翻译</el-radio-button>
      <el-radio-button value="edited">已编辑</el-radio-button>
    </el-radio-group>
    <div class="toolbar-spacer"></div>
    <!-- 统计标签移至同一行显示 -->
    <el-tag type="info">筛选: {{ projectStore.tableFilteredCount }}</el-tag>
    <el-tag type="success" style="margin-left:6px;">选中: {{ projectStore.tableSelectionCount }}</el-tag>
  </div>
  <el-dialog v-model="batchDialogVisible" title="批量翻译" width="520px">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="目标语言数量">{{ configStore.config.targetLanguages.length }}</el-descriptions-item>
      <el-descriptions-item label="选中条目数">
        {{ projectStore.selectedItemNames.length || '（未选择，默认全部）' }}
      </el-descriptions-item>
    </el-descriptions>

    <LanguageSelector
      v-model="configStore.config.targetLanguages"
      :languages="allTargetLanguages"
      :default-collapsed="false"
    />

    <div style="margin-top:16px;">
      <el-checkbox v-model="configStore.config.autoUpdateTranslated">更新已翻译部分</el-checkbox>
    </div>
    <template #footer>
      <el-button @click="batchDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchTranslate">开始翻译</el-button>
    </template>
  </el-dialog>
 </template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import { Language } from '@/models/language'
import { Search, MessageBox } from '@element-plus/icons-vue'
import type { ResItem } from '@/models/resource'
import LanguageSelector from '@/components/common/LanguageSelector.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

// 对话框可见性
const batchDialogVisible = ref(false)

// removed unused fileStats to satisfy TS build

const allTargetLanguages = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

const canTranslate = computed(() => {
  const hasFile = !!(projectStore.selectedXmlData && projectStore.selectedXmlFile)
  return hasFile
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

  // 检查是否选择了目标语言
  const targets = configStore.config.targetLanguages
  if (targets.length === 0) {
    toast.warning('请先选择目标语言')
    return
  }

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
    // 保存 autoRetry 的原值
    const prev = configStore.config.autoRetry
    // 临时设置 autoRetry 为 autoUpdateTranslated 的值
    configStore.update('autoRetry', configStore.config.autoUpdateTranslated)
    try {
      await translationStore.startTranslation(items, configStore.config.targetLanguages)
    } finally {
      // 恢复原值
      configStore.update('autoRetry', prev)
    }
    const p = translationStore.progress
    toast.success(`批量翻译完成：${p.completed} 成功，${p.failed} 失败`)
    batchDialogVisible.value = false
  } catch (e: any) {
    toast.fromError(e, '翻译失败')
  }
}
</script>

<style scoped>
.ops { padding: 8px 12px; border-bottom: 1px solid var(--ep-border-color); flex-wrap: wrap; row-gap: 6px; }
.ops :deep(.el-checkbox) { margin-right: 6px; }
.ops :deep(.el-checkbox:last-child) { margin-right: 0; }
</style>
