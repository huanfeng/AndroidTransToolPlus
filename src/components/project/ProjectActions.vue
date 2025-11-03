<template>
  <div class="toolbar">
    <el-button size="small" type="primary" @click="onOpen" :loading="projectStore.isScanning || projectStore.isLoading">
      <el-icon><FolderOpened /></el-icon>
      打开
    </el-button>
    <el-button size="small" @click="projectStore.closeProject" :disabled="!projectStore.hasProject">
      <el-icon><CloseBold /></el-icon>
      关闭
    </el-button>
    <el-button size="small" type="success" @click="onSave" :disabled="!projectStore.isLoaded">
      <el-icon><Document /></el-icon>
      保存
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import { FolderOpened, CloseBold, Document } from '@element-plus/icons-vue'

const projectStore = useProjectStore()

async function onOpen() {
  const ok = await projectStore.openProject()
  if (ok) {
    ElMessage.success('项目已打开')
    await projectStore.loadProject().catch(() => {})
  }
}

async function onSave() {
  try {
    await projectStore.saveProject()
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}
</script>

<style scoped>
.toolbar { display: flex; gap: 6px; }
</style>

