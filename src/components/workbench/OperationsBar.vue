<template>
  <div class="toolbar ops">
    <el-button size="small" @click="reloadFile" :disabled="!projectStore.selectedXmlFile">
      重新加载文件
    </el-button>
    <el-button size="small" type="success" @click="saveCurrentDir" :disabled="!projectStore.selectedResDir">
      保存当前目录
    </el-button>
    <el-divider direction="vertical" />
    <el-select v-model="selectedLangs" multiple collapse-tags size="small" placeholder="选择目标语言" style="min-width: 280px;">
      <el-option v-for="l in allTargetLanguages" :key="l" :label="langName(l)" :value="l" />
    </el-select>
    <el-button size="small" type="primary" @click="batchTranslate" :disabled="!canTranslate">
      批量翻译
    </el-button>
    <div class="toolbar-spacer"></div>
    <el-tag size="small" v-if="fileStats">项目: {{ projectStore.projectStats.totalItems }} 项 | 文件: {{ fileStats.totalItems }} 项</el-tag>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { useConfigStore } from '@/stores/config'
import { Language, getLanguageName } from '@/models/language'

const projectStore = useProjectStore()
const translationStore = useTranslationStore()
const configStore = useConfigStore()

const selectedLangs = ref<Language[]>([])

const fileStats = computed(() => projectStore.selectedFileStats)

const allTargetLanguages = computed(() => configStore.config.enabledLanguages.filter(l => l !== Language.DEF))

function langName(l: Language) { return getLanguageName(l, 'cn') }

const canTranslate = computed(() => projectStore.selectedXmlData && projectStore.selectedXmlFile && selectedLangs.value.length > 0)

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

async function saveCurrentDir() {
  if (!projectStore.selectedResDir) return
  try {
    const loading = ElLoading.service({ lock: true, text: '保存中...' })
    await projectStore.saveResDir(projectStore.selectedResDir)
    loading.close()
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function batchTranslate() {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  try {
    const merged = projectStore.selectedXmlData.mergeAllItems()
    const loading = ElLoading.service({ lock: true, text: '翻译中...' })
    await translationStore.batchTranslate(merged, selectedLangs.value)
    loading.close()
    ElMessage.success('批量翻译完成')
  } catch (e: any) {
    ElMessage.error(e?.message || '翻译失败')
  }
}
</script>

<style scoped>
.ops { padding: 8px 12px; border-bottom: 1px solid var(--ep-border-color); }
</style>
