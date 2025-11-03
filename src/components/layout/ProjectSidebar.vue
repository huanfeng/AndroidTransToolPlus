<template>
  <div class="sidebar">
    <ProjectActions class="actions" />
    <el-divider style="margin:8px 0" />
    <ResourceTree class="tree" />
  </div>
</template>

<script setup lang="ts">
import ProjectActions from '@/components/project/ProjectActions.vue'
import ResourceTree from '@/components/resource/ResourceTree.vue'
</script>

<style scoped>
.sidebar { display: flex; flex-direction: column; height: 100%; }
.actions { padding: 4px; }
.tree { flex: 1; min-height: 0; overflow: auto; }
</style>

