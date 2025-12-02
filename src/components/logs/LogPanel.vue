<template>
  <div class="log-panel">
    <div class="log-layout">
      <el-scrollbar height="200px" ref="scrollRef" class="log-scroll">
        <div class="logs">
          <div v-for="log in logStore.filteredLogs" :key="log.id" class="log-line">
            <el-tag
              size="small"
              :type="tagType(log.level)"
              style="width: 74px; text-align: center"
              >{{ levelName(log.level) }}</el-tag
            >
            <span class="time">{{ log.timestamp.toLocaleTimeString() }}</span>
            <span class="msg">{{ log.message }}</span>
          </div>
        </div>
      </el-scrollbar>
      <div class="side-tools">
        <el-select v-model="minLevel" size="small" class="w-full">
          <el-option v-for="lvl in levels" :key="lvl.value" :label="lvl.label" :value="lvl.value" />
        </el-select>
        <el-button size="small" @click="onExport" class="full-btn">导出</el-button>
        <el-button size="small" @click="logStore.clear" class="full-btn">清空</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useLogStore, LogLevel } from '@/stores/log'
import { useConfigStore } from '@/stores/config'

const logStore = useLogStore()
const configStore = useConfigStore()
const scrollRef = ref()

const levels = [
  { label: 'TRACE', value: LogLevel.TRACE },
  { label: 'DEBUG', value: LogLevel.DEBUG },
  { label: 'INFO', value: LogLevel.INFO },
  { label: 'WARNING', value: LogLevel.WARNING },
  { label: 'ERROR', value: LogLevel.ERROR },
]

const minLevel = computed({
  get: () => logStore.minLevel,
  set: v => (logStore.minLevel = v as any),
})

function levelName(l: LogLevel) {
  switch (l) {
    case LogLevel.TRACE:
      return 'TRACE'
    case LogLevel.DEBUG:
      return 'DEBUG'
    case LogLevel.INFO:
      return 'INFO'
    case LogLevel.WARNING:
      return 'WARN'
    case LogLevel.ERROR:
      return 'ERROR'
  }
}

function tagType(l: LogLevel): 'info' | 'success' | 'warning' | 'danger' | undefined {
  switch (l) {
    case LogLevel.DEBUG:
      return 'info'
    case LogLevel.INFO:
      return 'success'
    case LogLevel.WARNING:
      return 'warning'
    case LogLevel.ERROR:
      return 'danger'
    default:
      return undefined
  }
}

function onExport() {
  const content = logStore.exportLogs()
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 自动滚动到底部
watch(
  () => logStore.filteredLogs.length,
  async () => {
    await nextTick()
    try {
      const api = scrollRef.value as any
      const wrap: HTMLElement | undefined = api?.wrapRef
      const target = wrap?.scrollHeight ? wrap.scrollHeight + 100 : 1e9
      requestAnimationFrame(() => api?.setScrollTop?.(target))
    } catch {}
  }
)

// 面板打开时也滚动到底部
watch(
  () => configStore.config.showLogView,
  async v => {
    if (v) {
      await nextTick()
      try {
        const api = scrollRef.value as any
        const wrap: HTMLElement | undefined = api?.wrapRef
        const target = wrap?.scrollHeight ? wrap.scrollHeight + 100 : 1e9
        requestAnimationFrame(() => api?.setScrollTop?.(target))
      } catch {}
    }
  }
)
</script>

<style scoped>
.log-layout {
  display: flex;
  align-items: stretch;
}
.log-scroll {
  flex: 1;
}
.side-tools {
  width: 120px;
  border-left: 1px solid var(--el-border-color);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.w-full {
  width: 100%;
}
.full-btn {
  width: 100%;
  display: inline-flex;
  justify-content: center;
}
/* 去除 Element Plus 纵向堆叠按钮默认的水平间距，避免不对齐 */
.side-tools :deep(.el-button + .el-button) {
  margin-left: 0 !important;
}
.logs {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  padding: 8px;
  padding-bottom: 32px;
}
.log-line {
  display: grid;
  grid-template-columns: 80px 80px 1fr;
  gap: 8px;
  align-items: center;
  padding: 2px 0;
}
.time {
  color: var(--ep-text-color-placeholder);
}
.msg {
  white-space: pre-wrap;
}
</style>
