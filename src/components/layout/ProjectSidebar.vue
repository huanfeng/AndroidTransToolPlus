<template>
  <div class="sidebar">
    <div class="project-info">
      <el-icon><Folder /></el-icon>
      <span class="name text-ellipsis" :title="projectName">{{ projectName || '未打开项目' }}</span>
    </div>
    <ProjectActions class="actions" />
    <el-divider style="margin:8px 0" />
    <ResourceTree class="tree" />
  </div>
</template>

<script setup lang="ts">
import ProjectActions from '@/components/project/ProjectActions.vue'
import ResourceTree from '@/components/resource/ResourceTree.vue'
import { useProjectStore } from '@/stores/project'
import { computed } from 'vue'
import { Folder } from '@element-plus/icons-vue'

const projectStore = useProjectStore()
const projectName = computed(() => projectStore.project?.name || '')
</script>

<style scoped>
.sidebar { display: flex; flex-direction: column; height: 100%; }
.project-info { display:flex; align-items:center; gap:8px; padding: 6px 6px 0; font-weight: 600; }
.name { max-width: 220px; }
.actions { padding: 4px; }
.tree { flex: 1; min-height: 0; overflow: auto; }
</style>
