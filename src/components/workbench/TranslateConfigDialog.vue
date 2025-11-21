<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-descriptions :column="1" border v-if="description">
      <el-descriptions-item v-if="description.key" :label="description.key.label">
        {{ description.key.value }}
      </el-descriptions-item>
      <el-descriptions-item v-if="description.defaultText" :label="description.defaultText.label">
        {{ description.defaultText.value }}
      </el-descriptions-item>
      <el-descriptions-item v-if="description.language" :label="description.language.label">
        {{ description.language.value }}
      </el-descriptions-item>
    </el-descriptions>

    <div style="margin-top:16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary);">翻译范围</h4>
      <el-radio-group v-model="selectedScope">
        <el-radio v-for="scope in scopeOptions" :key="scope.value" :label="scope.value">
          {{ scope.label }} ({{ scope.count }})
        </el-radio>
      </el-radio-group>
    </div>

    <div v-if="showTargetLanguages" style="margin-top:16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary);">选择目标语言</h4>
      <div style="display:flex; gap:8px; margin-bottom:8px;">
        <el-button @click="selectAllLangs" size="small">全选</el-button>
        <el-button @click="clearAllLangs" size="small">全不选</el-button>
        <el-button @click="invertLangs" size="small">反选</el-button>
      </div>
      <el-checkbox-group v-model="selectedLanguages" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
        <el-checkbox v-for="l in allTargetLanguages" :key="l" :value="l">{{ langLabel(l) }}</el-checkbox>
      </el-checkbox-group>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirmTranslate" :disabled="!canConfirm">
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { Language, getLanguageName, getLanguageInfo } from '@/models/language'

interface ScopeOption {
  value: string
  label: string
  count: number
}

interface Description {
  key?: { label: string; value: string }
  defaultText?: { label: string; value: string }
  language?: { label: string; value: string }
}

interface Props {
  modelValue: boolean
  type: 'key' | 'lang-header' | 'cell'
  title: string
  confirmText?: string
  description?: Description
  scopeOptions: ScopeOption[]
  allTargetLanguages?: Language[]
  defaultSelectedLanguages?: Language[]
  showTargetLanguages?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '开始翻译',
  showTargetLanguages: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { scope: string; languages: Language[] }): void
}>()

const configStore = useConfigStore()
const selectedScope = ref('')
const selectedLanguages = ref<Language[]>([])

const allTargetLanguages = computed(() => {
  if (props.type === 'lang-header') {
    // 语言表头不需要目标语言选择
    return []
  }
  return props.allTargetLanguages || configStore.config.enabledLanguages.filter(l => l !== Language.DEF)
})

const scopeOptions = computed(() => props.scopeOptions)

const canConfirm = computed(() => {
  if (!selectedScope.value) return false
  if (props.showTargetLanguages && props.type !== 'lang-header') {
    return selectedLanguages.value.length > 0
  }
  return true
})

const langLabel = (l: Language) => {
  const info = getLanguageInfo(l)
  return `${getLanguageName(l, 'cn')} (${info.androidCode})`
}

watch(() => props.modelValue, (val) => {
  if (val) {
    // 重置状态
    selectedScope.value = scopeOptions.value[0]?.value || ''
    selectedLanguages.value = props.defaultSelectedLanguages || props.allTargetLanguages || []
  }
})

function selectAllLangs() {
  selectedLanguages.value = allTargetLanguages.value.slice()
}

function clearAllLangs() {
  selectedLanguages.value = []
}

function invertLangs() {
  const current = selectedLanguages.value
  const set = new Set(current)
  selectedLanguages.value = allTargetLanguages.value.filter(l => !set.has(l))
}

function confirmTranslate() {
  emit('confirm', {
    scope: selectedScope.value,
    languages: selectedLanguages.value
  })
}
</script>
