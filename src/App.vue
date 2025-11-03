<template>
  <el-container class="app-shell">
    <!-- 顶栏 -->
    <el-header height="48px" class="app-header">
      <AppHeader
        @open-settings="showSettings = true"
        @open-about="showAbout = true"
        @toggle-log="configStore.update('showLogView', !configStore.config.showLogView)"
      />
    </el-header>

    <!-- 主体区域：左侧栏 + 工作区 -->
    <el-container class="app-body">
      <el-aside width="280px" class="app-aside">
        <ProjectSidebar />
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
import AppHeader from '@/components/layout/AppHeader.vue'
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
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}
</script>

<style scoped>
.app-shell { height: 100vh; }
.app-header { border-bottom: 1px solid var(--ep-border-color); }
.app-aside { border-right: 1px solid var(--ep-border-color); }
.app-main { padding: 0; }
.workbench { display: flex; flex-direction: column; height: 100%; }
.workbench-table { flex: 1; min-height: 0; padding: 8px 12px 12px; }
.app-footer { border-top: 1px solid var(--ep-border-color); padding: 0; height: 220px; }
.app-body { min-height: 0; }
</style>
