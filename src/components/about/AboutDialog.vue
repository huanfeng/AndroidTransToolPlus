<template>
  <el-dialog
    :model-value="visible"
    title="关于"
    width="560px"
    :show-close="!requireAcknowledge"
    :close-on-click-modal="!requireAcknowledge"
    :close-on-press-escape="!requireAcknowledge"
    @close="handleClose"
  >
    <el-tabs v-model="innerTab">
      <el-tab-pane label="关于" name="info">
        <div class="about">
          <div class="logo-container">
            <img class="logo" src="/favicon.svg" alt="Android Trans Tool Plus" />
          </div>
          <h2 class="app-name">{{ appName }}</h2>
          <p class="version">版本 {{ version }}</p>
          <p class="description">{{ description }}</p>
          <el-divider />
          <div class="tech-stack">
            <p><strong>技术栈</strong></p>
            <p>Vue 3 + Vite + Pinia + Element Plus + TypeScript</p>
          </div>
          <el-divider />
          <p class="muted">本工具支持 Chrome/Edge 等浏览器环境</p>
          <p class="copyright">Copyright © {{ year }}</p>
        </div>
      </el-tab-pane>
      <el-tab-pane label="使用须知" name="notice">
        <ul class="notice-list">
          <li>
            本项目为纯前端应用，除访问您配置的兼容 OpenAI 服务外，不会向其他服务器发送任何数据。
          </li>
          <li>使用前请先配置兼容 OpenAI 的 API 地址与 Token，否则无法调用翻译能力。</li>
          <li>在点击“保存”之前，不会写入任何本地文件。</li>
          <li>保存操作会直接修改目标文件且不可撤销，请提前备份。</li>
          <li>风险提示：使用本工具需自行承担全部风险，本项目不对使用后果承担任何责任。</li>
        </ul>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button v-if="!requireAcknowledge" @click="emit('update:visible', false)">关闭</el-button>
      <el-button type="primary" @click="emit('acknowledge')">我已知晓并继续</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import packageInfo from '../../../package.json'

const props = withDefaults(
  defineProps<{
    visible: boolean
    activeTab: 'notice' | 'info'
    requireAcknowledge?: boolean
  }>(),
  {
    activeTab: 'info',
    requireAcknowledge: false,
  }
)
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'update:activeTab', v: 'notice' | 'info'): void
  (e: 'acknowledge'): void
}>()

const appName = 'Android Trans Tool Plus'
const version = packageInfo.version
const description = packageInfo.description
const year = new Date().getFullYear()

const innerTab = computed({
  get: () => props.activeTab,
  set: val => emit('update:activeTab', val),
})

function handleClose() {
  if (!props.requireAcknowledge) {
    emit('update:visible', false)
  }
}
</script>

<style scoped>
.about {
  line-height: 1.8;
  text-align: center;
}
.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.logo {
  width: 80px;
  height: 80px;
}
.app-name {
  margin: 10px 0;
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}
.version {
  margin: 5px 0;
  font-size: 14px;
  color: var(--el-color-primary);
  font-weight: 500;
}
.description {
  margin: 15px 0;
  font-size: 15px;
  color: var(--el-text-color-regular);
}
.tech-stack {
  margin: 10px 0;
}
.tech-stack p:first-child {
  margin-bottom: 8px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin: 10px 0;
}
.copyright {
  margin-top: 10px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.notice-list {
  padding-left: 18px;
  line-height: 1.7;
}
.notice-list li + li {
  margin-top: 8px;
}
</style>
