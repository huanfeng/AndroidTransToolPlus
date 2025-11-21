<template>
  <el-dialog
    :model-value="modelValue"
    :title="config?.title || '翻译配置'"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-descriptions :column="1" border v-if="config?.description">
      <el-descriptions-item v-if="config.description.key" :label="config.description.key.label">
        {{ config.description.key.value }}
      </el-descriptions-item>
      <el-descriptions-item v-if="config.description.defaultText" :label="config.description.defaultText.label">
        {{ config.description.defaultText.value }}
      </el-descriptions-item>
      <el-descriptions-item v-if="config.description.language" :label="config.description.language.label">
        {{ config.description.language.value }}
      </el-descriptions-item>
      <el-descriptions-item v-if="isBatchToolbar && config.context.selectedCount !== undefined" label="选中条目数">
        {{ config.context.selectedCount || '（未选择，默认全部）' }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- 翻译范围选择 -->
    <div v-if="!isCellTranslate && !isKeyTranslate" style="margin-top:16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary);">{{ firstLayerTitle }}</h4>
      <el-radio-group v-model="selectedScope">
        <el-radio v-for="scope in firstLayerScopeOptions" :key="scope.value" :value="scope.value">
          {{ scope.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 翻译内容选择（批量翻译第二层） -->
    <div v-if="isBatchTranslate || isBatchToolbar" style="margin-top:16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary);">{{ secondLayerTitle }}</h4>
      <el-radio-group v-model="selectedContent">
        <el-radio v-for="content in secondLayerContentOptions" :key="content.value" :value="content.value">
          {{ content.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 翻译语言筛选（Key对话框专用） -->
    <div v-if="isKeyTranslate" style="margin-top:16px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary);">过滤语言</h4>
      <el-radio-group v-model="selectedContent">
        <el-radio v-for="lang in languageFilterOptions" :key="lang.value" :value="lang.value">
          {{ lang.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 目标语言选择 -->
    <div v-if="config?.showTargetLanguages" style="margin-top:16px;">
      <LanguageSelector
        v-model="selectedLanguages"
        :languages="allTargetLanguagesComputed"
        :default-collapsed="config.languageSelectorCollapsed"
      />
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirmTranslate" :disabled="!canConfirm">
        {{ config?.confirmText || '开始翻译' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { Language } from '@/models/language'
import LanguageSelector from '@/components/common/LanguageSelector.vue'

interface ScopeOption {
  value: string
  label: string
  count: number
}

interface ContentOption {
  value: string
  label: string
  count: number
}

interface LanguageOption {
  value: string
  label: string
  count: number
}

interface Description {
  key?: { label: string; value: string }
  defaultText?: { label: string; value: string }
  language?: { label: string; value: string }
}

interface DialogConfig {
  type: 'key' | 'lang-header' | 'cell' | 'batch-toolbar'
  title: string
  confirmText: string
  description: Description
  scopeOptions: ScopeOption[]
  contentOptions?: ContentOption[]  // 第二层选项（批量翻译用）
  languageOptions?: LanguageOption[]  // 翻译语言筛选选项（Key对话框用）
  allTargetLanguages: Language[]
  defaultSelectedLanguages: Language[]
  showTargetLanguages: boolean
  languageSelectorCollapsed: boolean
  expectedItemCount?: number  // 预期可翻译的项目数，用于禁用按钮
  context: {
    itemName: string | null
    lang: Language | null
    selectedCount?: number  // 选中的条目数
  }
}

interface Props {
  modelValue: boolean
  config: DialogConfig | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { scope: string; content?: string; languages: Language[] }): void
}>()

const configStore = useConfigStore()
const selectedScope = ref('')
const selectedContent = ref('')  // 第二层选择
const selectedLanguages = ref<Language[]>([])

// 是否为批量翻译（语言标题头）
const isBatchTranslate = computed(() => {
  return props.config?.type === 'lang-header'
})

// 是否为工具栏批量翻译
const isBatchToolbar = computed(() => {
  return props.config?.type === 'batch-toolbar'
})

// 是否为Key翻译
const isKeyTranslate = computed(() => {
  return props.config?.type === 'key'
})

// 是否为单元格翻译
const isCellTranslate = computed(() => {
  return props.config?.type === 'cell'
})

// 第一层：翻译范围选项
const firstLayerScopeOptions = computed(() => {
  return props.config?.scopeOptions || []
})

// 第一层标题
const firstLayerTitle = computed(() => {
  if (isBatchTranslate.value || isBatchToolbar.value) return '选择行'
  return '翻译范围'
})

// 第二层：翻译内容选项（仅批量翻译显示）
const secondLayerContentOptions = computed(() => {
  return props.config?.contentOptions || []
})

// 第二层标题
const secondLayerTitle = computed(() => {
  return '过滤'
})

// 翻译语言筛选选项（Key对话框专用）
const languageFilterOptions = computed(() => {
  return props.config?.languageOptions || []
})

// 目标语言选项
const allTargetLanguagesComputed = computed(() => {
  if (!props.config) return []
  // 语言表头不需要目标语言选择（自动使用当前语言）
  if (props.config.type === 'lang-header') {
    return []
  }
  return props.config.allTargetLanguages || configStore.config.enabledLanguages.filter(l => l !== Language.DEF)
})

// 确认按钮是否可用
const canConfirm = computed(() => {
  // 单元格翻译直接可用
  if (isCellTranslate.value) return true

  // Key翻译需要选择翻译语言
  if (isKeyTranslate.value && !selectedContent.value) return false

  // 批量翻译需要第一层和第二层选择
  if ((isBatchTranslate.value || isBatchToolbar.value) && !selectedScope.value) return false
  if ((isBatchTranslate.value || isBatchToolbar.value) && !selectedContent.value) return false

  // 目标语言选择（仅工具栏批量翻译需要）
  if (isBatchToolbar.value && selectedLanguages.value.length === 0) return false

  // 检查预期可翻译项目数
  if (props.config?.expectedItemCount !== undefined && props.config.expectedItemCount === 0) {
    return false
  }

  return true
})

// 监听配置更新，重置状态
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    // 重置状态
    selectedScope.value = newConfig.scopeOptions[0]?.value || ''
    // Key翻译使用languageOptions，批量翻译使用contentOptions
    if (isKeyTranslate.value) {
      selectedContent.value = newConfig.languageOptions?.[0]?.value || ''
    } else if (isBatchTranslate.value || isBatchToolbar.value) {
      selectedContent.value = newConfig.contentOptions?.[0]?.value || ''
    } else {
      selectedContent.value = newConfig.contentOptions?.[0]?.value || ''
    }
    selectedLanguages.value = newConfig.defaultSelectedLanguages || newConfig.allTargetLanguages || []
  }
}, { immediate: true })

// 监听选择变化，动态更新预期可翻译数量（工具栏批量翻译用）
watch([() => props.config, selectedScope, selectedContent], ([config]) => {
  if (!config) return

  // 工具栏批量翻译需要动态计算
  if (isBatchToolbar.value) {
    // 根据选择动态计算预期数量
    // 这里暂时使用固定的计算，实际数量需要通过回调获取
    // 可以通过修改expectedItemCount的更新机制来实现
  }
}, { deep: true })

// 确认翻译
function confirmTranslate() {
  const emitData: any = {
    scope: selectedScope.value,
    languages: selectedLanguages.value
  }

  // Key翻译使用languageFilter作为语言选择
  if (isKeyTranslate.value) {
    emitData.languageFilter = selectedContent.value
  }

  // 批量翻译添加内容选择
  if (isBatchTranslate.value || isBatchToolbar.value) {
    emitData.content = selectedContent.value
  }

  emit('confirm', emitData)
}
</script>
