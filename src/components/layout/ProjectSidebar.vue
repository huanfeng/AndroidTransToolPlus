<template>
  <div class="sidebar">
    <div class="top">
      <div class="title-row">
        <el-icon><Flag /></el-icon>
        <span class="title">Android Trans Tool Plus</span>
      </div>
      <div class="btn-row">
        <el-button size="small" @click="toggleLog">日志</el-button>
        <el-button size="small" class="icon-text" @click="$emit('open-settings')">
          <el-icon><Setting /></el-icon>
          <span class="btn-text">设置</span>
        </el-button>
        <el-button size="small" class="icon-text" @click="$emit('open-about')">
          <el-icon><InfoFilled /></el-icon>
          <span class="btn-text">关于</span>
        </el-button>
      </div>
      <el-divider style="margin:8px 0" />
      <ProjectActions class="actions" />
      <div class="project-info">
        <el-icon><Folder /></el-icon>
        <el-tag v-if="projectName" type="info" effect="light" round>{{ projectName }}</el-tag>
        <el-tag v-else type="info" effect="light" round>未打开项目</el-tag>
      </div>
    </div>
    <ResourceTree class="tree" />
    <div class="status">
      <span>项目: {{ projectStore.projectStats.totalItems }} 项</span>
      <el-divider direction="vertical" />
      <span>文件: {{ fileStats?.totalItems ?? 0 }} 项</span>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import ProjectActions from '@/components/project/ProjectActions.vue'
import ResourceTree from '@/components/resource/ResourceTree.vue'
import { useProjectStore } from '@/stores/project'
import { useConfigStore } from '@/stores/config'
import { computed } from 'vue'
import { Folder, Flag, Setting, InfoFilled } from '@element-plus/icons-vue'

const projectStore = useProjectStore()
const configStore = useConfigStore()
const projectName = computed(() => projectStore.project?.name || '')
const fileStats = computed(() => projectStore.selectedFileStats)

defineEmits<{ (e: 'open-settings'): void; (e: 'open-about'): void }>()

function toggleLog() {
  configStore.update('showLogView', !configStore.config.showLogView)
}
</script>

<style scoped>
.sidebar { display: flex; flex-direction: column; height: 100%; }
.top { padding: 8px 8px 0; }
.title-row { display:flex; align-items:center; gap:8px; font-weight: 600; }
.btn-row { display:flex; justify-content:center; gap:8px; margin-top:6px; }
.project-info { display:flex; align-items:center; gap:8px; padding: 6px 0 10px; font-weight: 600; }
.name { max-width: 220px; }
.actions { padding: 4px 0; display:flex; justify-content:center; }
.tree { flex: 1; min-height: 0; overflow: auto; }
.status { border-top: 1px solid var(--el-border-color); padding:6px 8px; display:flex; align-items:center; gap:8px; font-size: 12px; color: var(--ep-text-color-placeholder); }
.icon-text { display: inline-flex; align-items: center; }
.btn-text { margin-left: 4px; position: relative; top: 0.5px; }
</style>
