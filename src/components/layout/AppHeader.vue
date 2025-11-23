<template>
  <div class="app-header">
    <div class="title-row">
      <el-icon><Flag /></el-icon>
      <span class="title">Android Trans Tool Plus</span>
    </div>
    <div class="progress-row" v-if="isTranslating">
      <el-progress :percentage="progress.percentage" :stroke-width="6" style="width: 200px" />
      <span class="progress-text">{{ progress.completed }}/{{ progress.total }}，失败 {{ progress.failed }}</span>
      <el-button
        type="danger"
        @click="confirmStopTranslation"
        :disabled="isStopping"
        style="margin-left:12px;"
      >
        <span v-if="!isStopping">停止翻译</span>
        <span v-else>正在停止中...</span>
      </el-button>
    </div>
    <div class="btn-row">
      <el-button :icon="Setting" @click="$emit('open-settings')">设置</el-button>
      <el-button :icon="InfoFilled" @click="$emit('open-about')">关于</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Flag, Setting, InfoFilled } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useTranslationStore } from '@/stores/translation'

const translationStore = useTranslationStore()
const isTranslating = computed(() => translationStore.isTranslating)
const isStopping = computed(() => translationStore.isStopping)
const progress = computed(() => translationStore.progress)

function confirmStopTranslation() {
  // TODO: 实现停止翻译确认逻辑
  translationStore.stopTranslation()
}

defineEmits<{
  (e: 'open-settings'): void
  (e: 'open-about'): void
}>()

</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 12px 16px;
  position: relative;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  flex-shrink: 0;
}
.progress-row {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
