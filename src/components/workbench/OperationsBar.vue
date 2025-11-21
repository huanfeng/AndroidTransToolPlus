<template>
  <div class="toolbar ops">
    <el-button @click="reloadFile" :disabled="!projectStore.selectedXmlFile">重新加载文件</el-button>
    <el-button type="primary" @click="openBatchTranslateDialog" :disabled="!canTranslate">
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

  <!-- 统一的翻译配置对话框 -->
  <TranslateConfigDialog
    v-model="showBatchDialog"
    :config="batchDialogConfig"
    @confirm="onBatchTranslateConfirm"
  />
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
import TranslateConfigDialog from './TranslateConfigDialog.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

// 批量翻译对话框状态
const showBatchDialog = ref(false)
const batchDialogConfig = ref<any>(null)

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

function openBatchTranslateDialog() {
  // 获取选中的条目数
  const selectedCount = projectStore.selectedItemNames?.length || 0

  // 获取所有条目数
  let allCount = 0
  if (projectStore.selectedXmlData && projectStore.selectedXmlFile) {
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(Language.DEF)
    allCount = def?.items.size || 0
  }

  // 准备对话框配置
  batchDialogConfig.value = {
    type: 'batch-toolbar' as const,
    title: '批量翻译',
    confirmText: '开始翻译',
    description: {}, // 空描述，不需要显示基本信息
    scopeOptions: [
      { value: 'selected', label: `已选中 (${selectedCount} 行)`, count: selectedCount },
      { value: 'all', label: `全部 (${allCount} 行)`, count: allCount }
    ],
    contentOptions: [
      { value: 'missing', label: `未翻译`, count: 0 },  // 实际数量需要在执行时计算
      { value: 'all', label: `全部`, count: 0 }
    ],
    allTargetLanguages: allTargetLanguages.value,
    defaultSelectedLanguages: configStore.config.targetLanguages,
    showTargetLanguages: true,
    languageSelectorCollapsed: false,
    context: {
      itemName: null,
      lang: null,
      selectedCount
    }
  }

  showBatchDialog.value = true
}

async function onBatchTranslateConfirm(data: { scope: string; content?: string; languages: Language[] }) {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return

  // 检查是否选择了目标语言
  if (data.languages.length === 0) {
    toast.warning('请先选择目标语言')
    return
  }

  try {
    // 获取要翻译的条目
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(Language.DEF)
    if (!def) throw new Error('Default language not available')
    const selectedSet = new Set(projectStore.selectedItemNames || [])
    const items = new Map<string, ResItem>()
    for (const [name, item] of def.items) {
      if (data.scope === 'selected') {
        if (selectedSet.has(name)) {
          items.set(name, item)
        }
      } else {
        items.set(name, item)
      }
    }

    // 检查实际可翻译数量
    if (items.size === 0) {
      toast.warning('没有可翻译的条目')
      return
    }

    // 保存 autoRetry 的原值
    const prev = configStore.config.autoRetry
    // 临时设置 autoRetry 为 content === 'all' 的值（更新已翻译部分）
    configStore.update('autoRetry', data.content === 'all')
    try {
      await translationStore.startTranslation(items, data.languages)
    } finally {
      // 恢复原值
      configStore.update('autoRetry', prev)
    }
    const p = translationStore.progress
    toast.success(`批量翻译完成：${p.completed} 成功，${p.failed} 失败`)

    // 关闭对话框
    showBatchDialog.value = false
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
