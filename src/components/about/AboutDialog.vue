<template>
  <el-dialog
    :model-value="visible"
    :title="$t('about.title')"
    width="560px"
    :show-close="!requireAcknowledge"
    :close-on-click-modal="!requireAcknowledge"
    :close-on-press-escape="!requireAcknowledge"
    @close="handleClose"
  >
    <el-tabs v-model="innerTab">
      <el-tab-pane :label="$t('about.tabs.about')" name="info">
        <div class="about">
          <div class="logo-container">
            <img class="logo" src="/favicon.svg" alt="Android Trans Tool Plus" />
          </div>
          <h2 class="app-name">{{ appName }}</h2>
          <p class="version">{{ $t('about.version', { version }) }}</p>
          <p class="description">{{ description }}</p>
          <el-divider />
          <div class="tech-stack">
            <p>
              <strong>{{ $t('about.techStack') }}</strong>
            </p>
            <p>{{ $t('about.techStackContent') }}</p>
          </div>
          <el-divider />
          <p class="muted">{{ $t('about.browserSupport') }}</p>
          <p class="copyright">{{ $t('about.copyright', { year }) }}</p>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('about.tabs.notice')" name="notice">
        <ul class="notice-list">
          <li>{{ $t('about.notice.item1') }}</li>
          <li>{{ $t('about.notice.item2') }}</li>
          <li>{{ $t('about.notice.item3') }}</li>
          <li>{{ $t('about.notice.item4') }}</li>
          <li>{{ $t('about.notice.item5') }}</li>
        </ul>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button v-if="!requireAcknowledge" @click="emit('update:visible', false)">{{
        $t('common.close')
      }}</el-button>
      <el-button type="primary" @click="emit('acknowledge')">{{
        $t('about.acknowledge')
      }}</el-button>
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
