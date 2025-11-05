<template>
  <div class="app-header">
    <div class="title-row">
      <el-icon><Flag /></el-icon>
      <span class="title">Android Trans Tool Plus</span>
    </div>
    <div class="btn-row">
      <el-button size="small" :icon="Setting" @click="$emit('open-settings')">设置</el-button>
      <el-button size="small" :icon="InfoFilled" @click="$emit('open-about')">关于</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Flag, Setting, InfoFilled } from '@element-plus/icons-vue'

defineEmits<{
  (e: 'open-settings'): void
  (e: 'open-about'): void
}>()

</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 12px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
</style>
