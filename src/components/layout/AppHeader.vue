<template>
  <div class="app-header">
    <div class="title-row">
      <img width="24" height="24" src="/favicon.svg" alt="logo" />
      <span class="title">Android Trans Tool Plus</span>
    </div>
    <div class="progress-row" v-if="isTranslating">
      <el-progress :percentage="progress.percentage" :stroke-width="6" style="width: 200px" />
      <span class="progress-text">{{
        $t('header.progress.items', {
          completed: progress.completed,
          total: progress.total,
          failed: progress.failed,
          filesCompleted: projectProgress.filesCompleted,
          filesTotal: projectProgress.filesTotal,
        })
      }}</span>
      <el-button size="small" @click="showStatus = true" type="info" plain>{{
        $t('header.translationStatus')
      }}</el-button>
      <el-button
        type="danger"
        @click="confirmStopTranslation"
        :disabled="isStopping"
        style="margin-left: 12px"
      >
        <span v-if="!isStopping">{{ $t('header.stopTranslation') }}</span>
        <span v-else>{{ $t('header.stopping') }}</span>
      </el-button>
    </div>
    <el-dialog v-model="showStatus" :title="$t('header.translationStatus')" width="520px">
      <el-descriptions :column="1" border class="status-desc">
        <el-descriptions-item :label="$t('header.progress.files')">
          {{ projectProgress.filesCompleted }}/{{ projectProgress.filesTotal }}
          <el-progress
            :percentage="fileProgressPercent"
            :stroke-width="6"
            status="success"
            style="margin-top: 4px"
          />
        </el-descriptions-item>
        <el-descriptions-item :label="$t('header.progress.entries')">
          {{ progress.completed }}/{{ progress.total }}
          <el-progress
            :percentage="progress.percentage"
            :stroke-width="6"
            status="success"
            style="margin-top: 4px"
          />
        </el-descriptions-item>
        <el-descriptions-item :label="$t('header.progress.currentFile')" v-if="currentFileName">
          {{ currentResDir || $t('header.progress.unknownDir') }}/{{ currentFileName }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('header.progress.status')">
          <span v-if="isStopping">{{ $t('header.stopping') }}</span>
          <span v-else>{{ $t('header.translating') }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showStatus = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>
    <div class="btn-row">
      <LanguageSwitcher />
      <el-button :icon="Setting" @click="$emit('open-settings')">{{
        $t('header.settings')
      }}</el-button>
      <el-button :icon="InfoFilled" @click="$emit('open-about')">{{
        $t('header.about')
      }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Setting, InfoFilled } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useTranslationStore } from '@/stores/translation'
import LanguageSwitcher from './LanguageSwitcher.vue'

const translationStore = useTranslationStore()
const isTranslating = computed(() => translationStore.isTranslating)
const isStopping = computed(() => translationStore.isStopping)
const progress = computed(() => translationStore.progress)
const projectProgress = computed(() => translationStore.projectProgress)
const currentFileName = computed(() => translationStore.currentFileName)
const currentResDir = computed(() => translationStore.currentResDir)
const showStatus = ref(false)
const fileProgressPercent = computed(() => {
  const total = projectProgress.value.filesTotal || 0
  const done = projectProgress.value.filesCompleted || 0
  return total > 0 ? Math.round((done / total) * 100) : 0
})

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
.status-desc :deep(.el-descriptions__label.is-bordered-label) {
  width: 110px;
  min-width: 110px;
  white-space: nowrap;
}
.status-desc :deep(.el-descriptions__content) {
  word-break: break-all;
}
</style>
