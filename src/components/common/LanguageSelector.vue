<template>
  <div class="language-selector">
    <div class="header" @click="collapsed = !collapsed">
      <h4>{{ title }}</h4>
      <el-icon class="collapse-icon" :class="{ collapsed }">
        <ArrowDown />
      </el-icon>
    </div>
    <el-collapse-transition>
      <div v-show="!collapsed" class="content">
        <div class="button-group">
          <el-button @click="selectAll" size="small">全选</el-button>
          <el-button @click="clearAll" size="small">全不选</el-button>
          <el-button @click="invertSelection" size="small">反选</el-button>
        </div>
        <el-checkbox-group v-model="selected" class="checkbox-grid">
          <el-checkbox v-for="l in languages" :key="l" :value="l">{{ langLabel(l) }}</el-checkbox>
        </el-checkbox-group>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { Language, getLanguageName, getLanguageInfo } from '@/models/language'

interface Props {
  modelValue: Language[]
  languages: Language[]
  title?: string
  defaultCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择目标语言',
  defaultCollapsed: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Language[]): void
}>()

const collapsed = ref(props.defaultCollapsed)
// 使用计算属性而非watch，避免循环更新
const selected = computed({
  get: () => props.modelValue,
  set: (val: Language[]) => {
    emit('update:modelValue', val)
  },
})

const langLabel = (l: Language) => {
  const info = getLanguageInfo(l)
  return `${getLanguageName(l, 'cn')} (${info.androidCode})`
}

function selectAll() {
  selected.value = [...props.languages]
}

function clearAll() {
  selected.value = []
}

function invertSelection() {
  const currentSet = new Set(selected.value)
  selected.value = props.languages.filter(l => !currentSet.has(l))
}
</script>

<style scoped>
.language-selector {
  margin-top: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.collapse-icon {
  transition: transform 0.3s;
  color: var(--el-text-color-secondary);
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.content {
  padding-top: 8px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
</style>
