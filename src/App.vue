<template>
  <el-config-provider :locale="zhCn">
    <el-container class="app-shell">
      <!-- 顶部栏：标题 + 设置/关于 -->
      <el-header class="app-header">
        <AppHeader @open-settings="showSettings = true" @open-about="showAbout = true" />
      </el-header>
      <!-- 主体区域：左侧栏 + 工作区 -->
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
  </el-config-provider>

  <!-- 设置与关于对话框 -->
  <SettingsDialog v-model:visible="showSettings" />
  <AboutDialog v-model:visible="showAbout" />

  <!-- 项目恢复对话框 -->
  <el-dialog
    v-model="showRestoreDialog"
    title="恢复项目"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div style="padding: 16px 0">
      <p style="margin-bottom: 12px">检测到您上次打开的项目，是否要恢复？</p>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="注意"
        description="由于浏览器安全限制，您需要重新选择项目目录，但我们可以自动恢复您上次打开的文件。"
        style="margin-bottom: 12px"
      />
    </div>
    <template #footer>
      <el-button @click="skipRestore">跳过</el-button>
      <el-button type="primary" @click="confirmRestore">恢复项目</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useProjectStore } from '@/stores/project'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppHeader from '@/components/layout/AppHeader.vue'
import ProjectSidebar from '@/components/layout/ProjectSidebar.vue'
import OperationsBar from '@/components/workbench/OperationsBar.vue'
import ResourceTable from '@/components/workbench/ResourceTable.vue'
import LogPanel from '@/components/logs/LogPanel.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import AboutDialog from '@/components/about/AboutDialog.vue'
import { enableBeforeUnloadPrompt } from '@/utils/beforeUnload'
import { hasStoredProject } from '@/utils/projectPersistence'

const configStore = useConfigStore()
const projectStore = useProjectStore()
const showSettings = ref(false)
const showAbout = ref(false)
const showRestoreDialog = ref(false)

onMounted(() => {
  // 立即执行必要的同步操作
  if (!configStore.loaded) {
    configStore.load()
  }
  applyTheme(configStore.config.theme)

  // 将非关键操作推迟到下一个事件循环，避免阻塞主线程
  setTimeout(async () => {
    // 检查是否有存储的项目，尝试自动恢复
    if (hasStoredProject() && projectStore.isIdle) {
      showRestoreDialog.value = true
    }

    // 启用页面刷新/关闭提示
    enableBeforeUnloadPrompt()
  }, 0)
})

watch(
  () => configStore.config.theme,
  val => applyTheme(val)
)

async function confirmRestore() {
  showRestoreDialog.value = false
  await projectStore.restoreProject()
}

function skipRestore() {
  showRestoreDialog.value = false
}

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
.app-shell {
  height: 100vh;
}
.app-aside {
  border-right: 1px solid var(--el-border-color);
}
.app-main {
  padding: 0;
}
.workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.workbench-table {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
.app-footer {
  border-top: 1px solid var(--el-border-color);
  padding: 8px 0;
  height: 220px;
}
.app-body {
  min-height: 0;
}
</style>
