<template>
  <el-container class="app-shell">
    <!-- 主体区域：左侧栏（含顶栏内容） + 工作区 -->
    <el-container class="app-body">
      <el-aside width="280px" class="app-aside">
        <ProjectSidebar @open-settings="showSettings = true" @open-about="showAbout = true" />
      </el-aside>

      <el-main class="app-main">
        <!-- 操作功能栏 + 数据表 -->
        <div class="workbench">
          <OperationsBar />
          <div class="workbench-table">
            <ResourceTable />
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 底部日志栏（可隐藏） -->
    <el-footer v-show="configStore.config.showLogView" class="app-footer">
      <LogPanel />
    </el-footer>
  </el-container>

  <!-- 设置与关于对话框 -->
  <SettingsDialog v-model:visible="showSettings" />
  <AboutDialog v-model:visible="showAbout" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import ProjectSidebar from '@/components/layout/ProjectSidebar.vue'
import OperationsBar from '@/components/workbench/OperationsBar.vue'
import ResourceTable from '@/components/workbench/ResourceTable.vue'
import LogPanel from '@/components/logs/LogPanel.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import AboutDialog from '@/components/about/AboutDialog.vue'

const configStore = useConfigStore()
const showSettings = ref(false)
const showAbout = ref(false)

onMounted(() => {
  if (!configStore.loaded) {
    configStore.load()
  }
  applyTheme(configStore.config.theme)
})

watch(() => configStore.config.theme, (val) => applyTheme(val))

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  // 禁用过渡避免切换卡顿
  root.classList.add('theme-changing')
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  window.requestAnimationFrame(() => {
    root.classList.remove('theme-changing')
  })
}
</script>

<style scoped>
.app-shell { height: 100vh; }
.app-aside { border-right: 1px solid var(--el-border-color); }
.app-main { padding: 0; }
.workbench { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.workbench-table { flex: 1; min-height: 0; padding: 0; overflow: hidden; }
.app-footer { border-top: 1px solid var(--el-border-color); padding: 8px 0; height: 220px; }
.app-body { min-height: 0; }
</style>
