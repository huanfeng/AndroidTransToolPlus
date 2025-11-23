<template>
  <div class="toolbar">
    <el-button type="primary" :icon="FolderOpened" @click="onOpen" :loading="projectStore.isScanning || projectStore.isLoading">
      打开
    </el-button>
    <el-button :icon="CloseBold" @click="onClose" :disabled="!projectStore.hasProject">
      关闭
    </el-button>
    <el-button :icon="Document" type="success" @click="onSave" :disabled="!projectStore.isLoaded">
      保存
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { checkAndPromptUnsavedChanges } from '@/utils/beforeUnload'
import { FolderOpened, CloseBold, Document } from '@element-plus/icons-vue'

const projectStore = useProjectStore()

async function onOpen() {
  try {
    // 检查是否有未保存的修改
    await checkAndPromptUnsavedChanges()

    const ok = await projectStore.openProject()
    if (ok) {
      // 懒加载模式：扫描完目录即可使用
      toast.success('项目已打开')
    }
  } catch (e: any) {
    // 用户取消时不显示错误
    if (e.message !== 'User cancelled') {
      toast.fromError(e, '打开项目失败')
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
      toast.fromError(e, '关闭项目失败')
    }
  }
}

async function onSave() {
  try {
    const loading = ElLoading.service({ lock: true, text: '保存中...' })
    await projectStore.saveProject()
    loading.close()
    toast.success('保存成功')
  } catch (e: any) {
    toast.fromError(e, '保存失败')
  }
}
</script>

<style scoped>
.toolbar { display: flex; gap: 0px; }
</style>
