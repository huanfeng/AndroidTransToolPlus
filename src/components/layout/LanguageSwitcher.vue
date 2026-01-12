<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button text class="lang-switch-btn">
      <svg class="lang-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        />
      </svg>
      <span class="lang-label">{{ currentLabel }}</span>
      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="option in LOCALE_OPTIONS"
          :key="option.value"
          :command="option.value"
          :class="{ 'is-active': option.value === configStore.config.locale }"
        >
          {{ option.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { LOCALE_OPTIONS, type LocaleType } from '@/locales'

const configStore = useConfigStore()

const currentLabel = computed(() => {
  const option = LOCALE_OPTIONS.find(o => o.value === configStore.config.locale)
  return option?.label || '简体中文'
})

function handleCommand(locale: LocaleType) {
  configStore.update('locale', locale)
}
</script>

<style scoped>
.lang-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.lang-label {
  margin-left: 2px;
}

.is-active {
  color: var(--el-color-primary);
  font-weight: 500;
}
</style>
