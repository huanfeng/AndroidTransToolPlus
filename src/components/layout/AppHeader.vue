<template>
  <div class="header">
    <div class="left">
      <el-icon><Monitor /></el-icon>
      <span class="title">Android Trans Tool Plus</span>
    </div>
    <div class="center" />
    <div class="right">
      <el-button size="small" @click="$emit('toggle-log')">日志</el-button>
      <el-button size="small" @click="$emit('open-settings')">
        <el-icon><Setting /></el-icon>
        设置
      </el-button>
      <el-button size="small" @click="$emit('open-about')">
        <el-icon><InfoFilled /></el-icon>
        关于
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Setting, InfoFilled } from '@element-plus/icons-vue'

defineEmits<{
  (e: 'open-settings'): void
  (e: 'open-about'): void
  (e: 'toggle-log'): void
}>()

</script>

<style scoped>
.header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 8px; height: 48px; width: 100%; }
.left { display: flex; align-items: center; gap: 8px; }
.title { font-weight: 600; }
.center { text-align: center; }
.right { display: flex; justify-content: flex-end; gap: 8px; }
</style>
