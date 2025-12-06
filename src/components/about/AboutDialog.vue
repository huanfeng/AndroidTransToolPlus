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
      <p><b>Android Trans Tool Plus</b></p>
      <p>一个面向 Android 字符串资源的 AI 翻译与管理工具。</p>
      <p>技术栈：Vue 3 + Vite + Pinia + Element Plus</p>
      <p class="muted">本工具支持 Chrome/Edge 等浏览器环境。</p>
      <el-divider />
      <p>Copyright © {{ year }}</p>
    </div>
    <template #footer>
      <el-button type="primary" @click="emit('update:visible', false)">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()
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
.muted {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
</style>
