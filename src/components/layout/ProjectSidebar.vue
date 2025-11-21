<template>
  <div class="sidebar">
    <div class="top">
      <!-- 顶部标题与按钮暂时隐藏以对比顶栏实现 -->
      <div class="title-row" v-if="false">
        <el-icon><Flag /></el-icon>
        <span class="title">Android Trans Tool Plus</span>
      </div>
      <div class="btn-row" v-if="false">
        <el-button :icon="Setting" @click="$emit('open-settings')">设置</el-button>
        <el-button :icon="InfoFilled" @click="$emit('open-about')">关于</el-button>
      </div>
      <el-divider style="margin:8px 0" v-if="false" />
      <div><ProjectActions class="actions" /></div>
      <div class="project-info">
        <el-icon><Folder /></el-icon>
        <el-tag v-if="projectName" type="info" effect="light" round>{{ projectName }}</el-tag>
        <el-tag v-else type="info" effect="light" round>未打开项目</el-tag>
      </div>
    </div>
    <ResourceTree class="tree" />
    <div class="status">
      <span>目录: {{ dirCount }}</span>
      <el-divider direction="vertical" />
      <span>资源文件: {{ fileCount }}</span>
      <div class="toolbar-spacer" />
      <el-button type="" :underline="true" @click="toggleLog">日志</el-button>
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
const dirCount = computed(() => projectStore.project?.resDirs.length || 0)
const fileCount = computed(() => {
  const p = projectStore.project
  if (!p) return 0
  let total = 0
  for (const rd of p.resDirs) total += rd.xmlFileNames.length
  return total
})

defineEmits<{ (e: 'open-settings'): void; (e: 'open-about'): void }>()

function toggleLog() {
  configStore.update('showLogView', !configStore.config.showLogView)
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.top {
  padding: 10px 12px 0;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.btn-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}
.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 12px;
  font-weight: 600;
}
.name {
  max-width: 220px;
}
.actions {
  padding: 4px 0;
  display: flex;
  justify-content: center;
}
.tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px;
}
.status {
  border-top: 1px solid var(--el-border-color);
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
}
.toolbar-spacer {
  flex: 1;
}
:deep(.status .el-link) {
  padding: 0;
  line-height: 1.2;
}
</style>
