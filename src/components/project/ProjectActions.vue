<template>
  <div class="toolbar">
    <el-button
      type="primary"
      :icon="FolderOpened"
      @click="onOpen"
      :loading="projectStore.isScanning || projectStore.isLoading"
      :disabled="translationStore.isTranslating"
    >
      {{ $t('project.open') }}
    </el-button>
    <el-button
      :icon="CloseBold"
      @click="onClose"
      :disabled="!projectStore.hasProject || translationStore.isTranslating"
    >
      {{ $t('project.close') }}
    </el-button>
    <el-button
      :icon="Document"
      type="success"
      @click="onSave"
      :disabled="!projectStore.isLoaded || translationStore.isTranslating"
    >
      {{ $t('project.save') }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { useTranslationStore } from '@/stores/translation'
import { checkAndPromptUnsavedChanges } from '@/utils/beforeUnload'
import { FolderOpened, CloseBold, Document } from '@element-plus/icons-vue'

const { t } = useI18n()
const projectStore = useProjectStore()
const translationStore = useTranslationStore()

async function onOpen() {
  try {
    // 检查是否有未保存的修改
    await checkAndPromptUnsavedChanges()

    const ok = await projectStore.openProject()
    if (ok) {
      // 懒加载模式：扫描完目录即可使用
      toast.success(t('project.opened'))
    }
  } catch (e: any) {
    // 用户取消时不显示错误
    if (e.message !== 'User cancelled') {
      toast.fromError(e, t('project.openFailed'))
    }
  }
}

async function onClose() {
  try {
    // 检查是否有未保存的修改
    await checkAndPromptUnsavedChanges()

    projectStore.closeProject()
  } catch (e: any) {
    // 用户取消时不显示错误
    if (e.message !== 'User cancelled') {
      toast.fromError(e, t('project.closeFailed'))
    }
  }
}

async function onSave() {
  try {
    const loading = ElLoading.service({ lock: true, text: t('common.saving') })
    await projectStore.saveProject()
    loading.close()
    toast.success(t('project.saved'))
  } catch (e: any) {
    toast.fromError(e, t('project.saveFailed'))
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 0px;
}
</style>
