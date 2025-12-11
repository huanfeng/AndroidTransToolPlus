<template>
  <div class="toolbar ops">
    <el-button
      @click="reloadFile"
      :disabled="!projectStore.selectedXmlFile || translationStore.isTranslating"
      >重新加载文件</el-button
    >
    <el-button type="primary" @click="openBatchTranslateDialog" :disabled="!canTranslate">
      <el-icon style="margin-right: 4px"><MessageBox /></el-icon>
      批量翻译
    </el-button>
    <el-button
      type="warning"
      @click="openProjectTranslateDialog"
      :disabled="!projectStore.project || translationStore.isTranslating"
    >
      <el-icon style="margin-right: 4px"><MessageBox /></el-icon>
      项目翻译
    </el-button>
    <el-button
      type="success"
      @click="saveCurrentFile"
      :disabled="!projectStore.selectedXmlFile || translationStore.isTranslating"
      >保存当前文件</el-button
    >
    <el-divider direction="vertical" />
    <!-- 搜索 / 筛选 放到与操作同一行 -->
    <el-input
      v-model="projectStore.tableFilterText"
      clearable
      placeholder="搜索 Key / 默认文本"
      style="max-width: 320px"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <el-radio-group v-model="projectStore.tableFilterCurrent" style="margin-left: 8px">
      <el-radio-button value="">全部</el-radio-button>
      <el-radio-button value="incomplete">未完成</el-radio-button>
      <el-radio-button value="untranslatable">不可翻译</el-radio-button>
      <el-radio-button value="edited">已编辑</el-radio-button>
    </el-radio-group>
    <div class="toolbar-spacer"></div>
    <!-- 统计标签移至同一行显示 -->
    <el-tag type="info">筛选: {{ projectStore.tableFilteredCount }}</el-tag>
    <el-tag type="success" style="margin-left: 6px"
      >选中: {{ projectStore.tableSelectionCount }}</el-tag
    >
  </div>

  <!-- 统一的翻译配置对话框 -->
  <TranslateConfigDialog
    v-model="showBatchDialog"
    :config="batchDialogConfig"
    @confirm="onBatchTranslateConfirm"
  />
  <TranslateConfigDialog
    v-model="showProjectDialog"
    :config="projectDialogConfig"
    @confirm="onProjectTranslateConfirm"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import { LANGUAGE, type Language } from '@/models/language'
import { Search, MessageBox } from '@element-plus/icons-vue'
import type { ResItem } from '@/models/resource'
import { checkAndPromptUnsavedChanges } from '@/utils/beforeUnload'
import TranslateConfigDialog from './TranslateConfigDialog.vue'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

// 批量翻译对话框状态
const showBatchDialog = ref(false)
const batchDialogConfig = ref<any>(null)
const showProjectDialog = ref(false)
const projectDialogConfig = ref<any>(null)

const allTargetLanguages = computed(() =>
  configStore.config.enabledLanguages.filter(l => l !== LANGUAGE.DEF)
)

const canTranslate = computed(() => {
  const hasFile = !!(projectStore.selectedXmlData && projectStore.selectedXmlFile)
  const isTranslating = translationStore.isTranslating
  return hasFile && !isTranslating
})

async function reloadFile() {
  try {
    // 检查是否有未保存的修改
    await checkAndPromptUnsavedChanges()

    const loading = ElLoading.service({ lock: true, text: '重载中...' })
    await projectStore.reloadSelectedFile()
    loading.close()
    toast.success('文件已重新加载')
  } catch (e: any) {
    // 用户取消时不显示错误
    if (e.message !== 'User cancelled') {
      toast.fromError(e, '重载失败')
    }
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
  let missingAllCount = 0
  let missingSelectedCount = 0
  const allItemNames: string[] = []
  const selectedItemNames = projectStore.selectedItemNames
    ? [...projectStore.selectedItemNames]
    : []
  const missingByItem: Record<string, Language[]> = {}
  if (projectStore.selectedXmlData && projectStore.selectedXmlFile) {
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(LANGUAGE.DEF)
    allCount = def?.items.size || 0

    // 计算未翻译数量（全部/选中）
    if (def && fileMap) {
      const selectedSet = new Set(projectStore.selectedItemNames || [])

      const targetLangs = allTargetLanguages.value
      for (const [name, item] of def.items) {
        if (!item.translatable) continue
        allItemNames.push(name)

        const missingLangs: Language[] = []
        for (const lang of targetLangs) {
          const langData = fileMap.get(lang)
          const langItem = langData?.items.get(name)
          const v = langItem?.valueMap.get(lang)
          const missing =
            typeof v === 'string' ? v.length === 0 : Array.isArray(v) ? v.length === 0 : true
          if (missing) missingLangs.push(lang)
        }

        if (missingLangs.length) {
          missingByItem[name] = missingLangs
          missingAllCount += missingLangs.length
          if (selectedSet.has(name)) missingSelectedCount += missingLangs.length
        }
      }
    }
  }

  // 准备对话框配置
  batchDialogConfig.value = {
    type: 'batch-toolbar' as const,
    title: '批量翻译',
    confirmText: '开始翻译',
    description: null, // 工具栏对话框不需要显示基本信息
    scopeOptions: [
      { value: 'selected', label: `已选中 (${selectedCount} 行)`, count: selectedCount },
      { value: 'all', label: `全部 (${allCount} 行)`, count: allCount },
    ],
    contentOptions: [
      { value: 'missing', label: '未翻译', count: missingAllCount },
      { value: 'all', label: '全部', count: allCount },
    ],
    allTargetLanguages: allTargetLanguages.value,
    defaultSelectedLanguages: configStore.config.targetLanguages,
    showTargetLanguages: true,
    languageSelectorCollapsed: false,
    expectedItemCount: allCount, // 初始值为全部数量
    context: {
      itemName: null,
      lang: null,
      selectedCount,
      selectedNames: selectedItemNames,
      allNames: allItemNames,
      missingByItem,
      missingAllCount,
      missingSelectedCount,
    },
  }

  showBatchDialog.value = true
}

function openProjectTranslateDialog() {
  if (!projectStore.project) {
    toast.warning('请先打开项目')
    return
  }

  const targetLangs = allTargetLanguages.value
  const project = projectStore.project
  const totalFilesAll = project.resDirs.reduce((sum, dir) => {
    const xmlData = project.xmlDataMap.get(dir.relativePath)
    return sum + (xmlData ? xmlData.getXmlFileNames().length : 0)
  }, 0)
  const totalFilesCurrent = projectStore.selectedResDir
    ? project.xmlDataMap.get(projectStore.selectedResDir)?.getXmlFileNames().length || 0
    : 0

  // 无法精确统计未翻译项时，使用“待处理文件数”作提示值
  projectDialogConfig.value = {
    type: 'project' as const,
    title: '项目翻译',
    confirmText: '开始项目翻译',
    description: null,
    scopeOptions: [
      { value: 'current', label: `当前目录 (${totalFilesCurrent} 文件)`, count: totalFilesCurrent },
      { value: 'all', label: `全部 (${totalFilesAll} 文件)`, count: totalFilesAll },
    ],
    contentOptions: [
      { value: 'missing', label: '仅未翻译（需加载统计）', count: totalFilesAll },
      { value: 'all', label: '全部', count: totalFilesAll },
    ],
    allTargetLanguages: targetLangs,
    defaultSelectedLanguages: configStore.config.targetLanguages,
    showTargetLanguages: true,
    languageSelectorCollapsed: false,
    expectedItemCount: totalFilesCurrent || totalFilesAll || 0,
    context: {
      missingAllCount: totalFilesAll,
      allCount: totalFilesAll,
    },
  }

  showProjectDialog.value = true
}

async function onBatchTranslateConfirm(data: {
  scope: string
  languages: Language[]
  autoUpdateTranslated?: boolean
}) {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return

  // 检查是否选择了目标语言
  if (data.languages.length === 0) {
    toast.warning('请先选择目标语言')
    return
  }

  try {
    // 获取要翻译的条目
    const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
    const def = fileMap?.get(LANGUAGE.DEF)
    if (!def) throw new Error('Default language not available')
    const selectedSet = new Set(projectStore.selectedItemNames || [])
    const items = new Map<string, ResItem>()

    // 根据范围过滤条目
    for (const [name, item] of def.items) {
      if (data.scope === 'selected') {
        // 选中范围：只包含选中的项
        if (selectedSet.has(name)) {
          items.set(name, item)
        }
      } else {
        // 全部范围：包含所有可翻译项
        items.set(name, item)
      }
    }

    // 检查实际可翻译数量
    if (items.size === 0) {
      toast.warning('没有可翻译的条目')
      return
    }

    // 先关闭对话框再执行耗时的翻译，避免界面阻塞在弹窗上
    showBatchDialog.value = false
    batchDialogConfig.value = null

    // 传递文件映射数据，用于统一的未翻译过滤逻辑
    await translationStore.batchTranslate(items, data.languages, data.autoUpdateTranslated, fileMap)

    toast.success(`批量翻译完成`)
  } catch (e: any) {
    toast.fromError(e, '翻译失败')
  }
}

async function onProjectTranslateConfirm(data: {
  scope: string
  content?: string
  languages: Language[]
  autoUpdateTranslated?: boolean
}) {
  if (!projectStore.project) {
    toast.warning('请先打开项目')
    return
  }
  if (!data.languages.length) {
    toast.warning('请先选择目标语言')
    return
  }

  try {
    showProjectDialog.value = false
    projectDialogConfig.value = null
    await translationStore.translateProject({
      languages: data.languages,
      autoUpdateTranslated: data.autoUpdateTranslated,
      scope: data.scope === 'current' ? 'current' : 'all',
    })
    toast.success('项目翻译完成')
  } catch (e: any) {
    toast.fromError(e, '项目翻译失败')
  }
}
</script>

<style scoped>
.ops {
  padding: 8px 12px;
  border-bottom: 1px solid var(--ep-border-color);
  flex-wrap: wrap;
  row-gap: 6px;
}
.ops :deep(.el-checkbox) {
  margin-right: 6px;
}
.ops :deep(.el-checkbox:last-child) {
  margin-right: 0;
}
</style>
