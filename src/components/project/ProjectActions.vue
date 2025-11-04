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
import { ElLoading } from 'element-plus'
import toast from '@/utils/toast'
import { useProjectStore } from '@/stores/project'
import { FolderOpened, CloseBold, Document } from '@element-plus/icons-vue'

const projectStore = useProjectStore()

async function onOpen() {
  const ok = await projectStore.openProject()
  if (ok) {
    const loading = ElLoading.service({ lock: true, text: '加载项目中...' })
    try {
      await projectStore.loadProject()
    toast.success('项目已打开')
    } catch {
      // error toast 由 store 内日志处理
    } finally {
      loading.close()
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
.toolbar { display: flex; gap: 6px; }
</style>
