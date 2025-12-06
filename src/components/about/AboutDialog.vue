<template>
  <el-dialog
    :model-value="visible"
    title="关于"
    width="520px"
    @close="emit('update:visible', false)"
  >
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
    <template #footer>
      <el-button type="primary" @click="emit('update:visible', false)">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import packageInfo from '../../../package.json'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const appName = 'Android Trans Tool Plus'
const version = packageInfo.version
const description = packageInfo.description
const year = new Date().getFullYear()
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
</style>
