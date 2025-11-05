<template>
  <div class="toolbar">
    <el-button size="small" type="primary" :icon="FolderOpened" @click="onOpen" :loading="projectStore.isScanning || projectStore.isLoading">
      打开
    </el-button>
    <el-button size="small" :icon="CloseBold" @click="projectStore.closeProject" :disabled="!projectStore.hasProject">
      关闭
    </el-button>
    <el-button size="small" :icon="Document" type="success" @click="onSave" :disabled="!projectStore.isLoaded">
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
    // 懒加载模式：扫描完目录即可使用
    toast.success('项目已打开')
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
