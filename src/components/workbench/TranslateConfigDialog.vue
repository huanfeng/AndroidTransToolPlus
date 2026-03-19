<template>
  <el-dialog
    :model-value="modelValue"
    :title="config?.title || $t('translateConfig.title')"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-descriptions :column="1" border v-if="config">
      <el-descriptions-item :label="pendingLabel">
        <span style="color: var(--el-color-danger); font-weight: 500">
          {{ pendingTranslateCount }}
        </span>
        <span
          v-if="config.type === 'project'"
          style="margin-left: 6px; color: var(--el-text-color-secondary)"
        >
          {{ $t('translateConfig.needLoadFile') }}
        </span>
      </el-descriptions-item>
      <template v-if="config.description">
        <el-descriptions-item v-if="config.description.key" :label="config.description.key.label">
          {{ config.description.key.value }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="config.description.defaultText"
          :label="config.description.defaultText.label"
        >
          {{ config.description.defaultText.value }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="config.description.language"
          :label="config.description.language.label"
        >
          {{ config.description.language.value }}
        </el-descriptions-item>
      </template>
    </el-descriptions>

    <!-- 翻译范围选择 -->
    <div v-if="!isCellTranslate && !isKeyTranslate" style="margin-top: 16px">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary)">
        {{ firstLayerTitle }}
      </h4>
      <el-radio-group v-model="selectedScope">
        <el-radio v-for="scope in firstLayerScopeOptions" :key="scope.value" :value="scope.value">
          {{ scope.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 翻译内容选择（批量翻译第二层） -->
    <div v-if="isBatchTranslate || isBatchToolbar" style="margin-top: 16px">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary)">
        {{ secondLayerTitle }}
      </h4>
      <el-radio-group v-model="selectedContent">
        <el-radio
          v-for="content in secondLayerContentOptions"
          :key="content.value"
          :value="content.value"
        >
          {{ content.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 翻译语言筛选（Key对话框专用） -->
    <div v-if="isKeyTranslate" style="margin-top: 16px">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--el-text-color-primary)">
        {{ $t('translateConfig.filterLanguage') }}
      </h4>
      <el-radio-group v-model="selectedContent">
        <el-radio v-for="lang in languageFilterOptions" :key="lang.value" :value="lang.value">
          {{ lang.label }}
        </el-radio>
      </el-radio-group>
    </div>

    <!-- 目标语言选择 -->
    <div v-if="config?.showTargetLanguages" style="margin-top: 16px">
      <LanguageSelector
        v-model="selectedLanguages"
        :languages="allTargetLanguagesComputed"
        :default-collapsed="config.languageSelectorCollapsed"
        :title="languageSelectorTitle"
      />
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmTranslate" :disabled="!canConfirm">
        {{ config?.confirmText || $t('translateConfig.startTranslate') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/config'
import { usePresetStore } from '@/stores/preset'
import { LANGUAGE, type Language } from '@/models/language'
import LanguageSelector from '@/components/common/LanguageSelector.vue'

const { t } = useI18n()

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
  type: 'key' | 'lang-header' | 'cell' | 'batch-toolbar' | 'project'
  title: string
  confirmText: string
  description: Description
  scopeOptions: ScopeOption[]
  contentOptions?: ContentOption[] // 第二层选项（批量翻译用）
  languageOptions?: LanguageOption[] // 翻译语言筛选选项（Key对话框用）
  allTargetLanguages: Language[]
  defaultSelectedLanguages: Language[]
  showTargetLanguages: boolean
  languageSelectorCollapsed: boolean
  expectedItemCount?: number // 预期可翻译的项目数，用于禁用按钮
  context: {
    itemName: string | null
    lang: Language | null
    selectedCount?: number // 选中的条目数
    missingAllCount?: number // 未翻译总数
    missingSelectedCount?: number // 选中范围内的未翻译数
    selectedNames?: string[]
    allNames?: string[]
    missingByItem?: Record<string, Language[]>
    missingCount?: number
    allCount?: number
  }
}

interface Props {
  modelValue: boolean
  config: DialogConfig | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'confirm',
    data: {
      scope: string
      content?: string
      languages: Language[]
      languageFilter?: string
      autoUpdateTranslated?: boolean
    }
  ): void
}>()

const configStore = useConfigStore()
const presetStore = usePresetStore()
const selectedScope = ref('')
const selectedContent = ref('') // 第二层选择
const selectedLanguages = ref<Language[]>([])
const expectedItemCount = ref<number>(0) // 内部维护的可翻译项目数
const pendingTranslateCount = computed(() => {
  if (props.config?.type === 'project') {
    // 项目模式：显示按 scope 估算的待处理文件数（radio 切换后 updateExpectedCount 会更新）
    return expectedItemCount.value ?? 0
  }
  return expectedItemCount.value ?? 0
})
const pendingLabel = computed(() =>
  props.config?.type === 'project'
    ? t('translateConfig.pendingFiles')
    : t('translateConfig.pendingItems')
)
const languageSelectorTitle = computed(() => {
  const total = allTargetLanguagesComputed.value.length
  const selected = selectedLanguages.value.length
  return t('translateConfig.selectTargetLanguage', { selected, total })
})

// 是否为批量翻译（语言标题头）
const isBatchTranslate = computed(() => {
  return props.config?.type === 'lang-header'
})

// 是否为工具栏批量翻译
const isBatchToolbar = computed(() => {
  return props.config?.type === 'batch-toolbar' || props.config?.type === 'project'
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
  if (isBatchTranslate.value || isBatchToolbar.value) return t('translateConfig.selectRows')
  return t('translateConfig.translateScope')
})

// 第二层：翻译内容选项（仅批量翻译显示）
const secondLayerContentOptions = computed(() => {
  return props.config?.contentOptions || []
})

// 第二层标题
const secondLayerTitle = computed(() => {
  return t('translateConfig.filter')
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
  return (
    props.config.allTargetLanguages ||
    presetStore.effectiveTargetLanguages
  )
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

  // 检查可翻译数量（工具栏批量翻译使用内部计算值）
  if (isBatchToolbar.value || isBatchTranslate.value || isKeyTranslate.value) {
    if (expectedItemCount.value === 0) return false
  }

  return true
})

// 根据当前配置和选择计算可翻译数量
function updateExpectedCount() {
  const cfg = props.config
  if (!cfg) return

  // 项目模式：按选择的 scope 直接显示文件数（不按语言放大）
  if (cfg.type === 'project') {
    const currentCount = cfg.scopeOptions.find(o => o.value === 'current')?.count || 0
    const allCount = cfg.scopeOptions.find(o => o.value === 'all')?.count || 0
    const usingCurrent = selectedScope.value === 'current'
    expectedItemCount.value = usingCurrent ? currentCount : allCount
    return
  }

  if (cfg.type === 'batch-toolbar') {
    const scopeSelected = cfg.scopeOptions.find(o => o.value === 'selected')?.count || 0
    const scopeAll = cfg.scopeOptions.find(o => o.value === 'all')?.count || 0
    const missingAll = cfg.context.missingAllCount ?? 0
    const missingSelected = cfg.context.missingSelectedCount ?? 0

    const usingSelected = selectedScope.value === 'selected'
    const baseNames = usingSelected ? cfg.context.selectedNames || [] : cfg.context.allNames || []
    const baseCount = usingSelected ? scopeSelected : scopeAll
    const missingCount = usingSelected ? missingSelected : missingAll

    // 按目标语言数量放大
    const langs = selectedLanguages.value.length
      ? selectedLanguages.value
      : cfg.defaultSelectedLanguages || []
    if (langs.length === 0) {
      expectedItemCount.value = 0
      return
    }

    let count = 0
    if (selectedContent.value === 'missing') {
      // 实际未翻译项数按行-语言交集计算
      const missingByItem = cfg.context.missingByItem || {}
      for (const name of baseNames) {
        const missingLangs = missingByItem[name] || []
        const hit = missingLangs.filter(l => langs.includes(l)).length
        count += hit
      }
      // 若缺少详细数据（没有missingByItem），退化为聚合计数 * 语言数
      if (count === 0 && !cfg.context.missingByItem && missingCount > 0) {
        count = missingCount * langs.length
      }
    } else {
      count = baseNames.length * langs.length
      if (count === 0 && baseCount > 0) {
        count = baseCount * langs.length
      }
    }
    expectedItemCount.value = count
    return
  }

  if (cfg.type === 'lang-header') {
    const scopeSelected = cfg.scopeOptions.find(o => o.value === 'selected')?.count || 0
    const scopeAll = cfg.scopeOptions.find(o => o.value === 'all')?.count || 0
    const missingAll = cfg.context.missingAllCount ?? 0
    const missingSelected = cfg.context.missingSelectedCount ?? 0

    const usingSelected = selectedScope.value === 'selected'
    const baseCount = usingSelected ? scopeSelected : scopeAll
    const missingCount = usingSelected ? missingSelected : missingAll

    expectedItemCount.value = selectedContent.value === 'missing' ? missingCount : baseCount
    return
  }

  if (cfg.type === 'key') {
    const baseCount = cfg.context.allCount ?? 0
    const missingCount = cfg.context.missingCount ?? 0
    expectedItemCount.value = selectedContent.value === 'missing' ? missingCount : baseCount
    return
  }

  if (cfg.expectedItemCount !== undefined) {
    expectedItemCount.value = cfg.expectedItemCount
  }
}

// 监听配置更新，重置状态（仅在配置变化时重置，避免循环）
watch(
  () => props.config,
  (newConfig, oldConfig) => {
    if (newConfig && newConfig !== oldConfig) {
      // 优先默认到“全部”以避免0条目时误选已选中
      const firstScope = newConfig.scopeOptions[0]?.value || ''
      const selectedOpt = newConfig.scopeOptions.find(
        o => o.value === 'selected' || o.value === 'current'
      )
      const allOpt = newConfig.scopeOptions.find(o => o.value === 'all')
      const shouldFallbackToAll =
        selectedOpt &&
        allOpt &&
        selectedOpt.count === 0 &&
        (newConfig.type === 'batch-toolbar' ||
          newConfig.type === 'project' ||
          newConfig.type === 'lang-header')
      selectedScope.value = shouldFallbackToAll ? allOpt.value : firstScope

      // Key翻译使用languageOptions，批量翻译使用contentOptions
      if (isKeyTranslate.value) {
        selectedContent.value = newConfig.languageOptions?.[0]?.value || ''
      } else if (isBatchTranslate.value || isBatchToolbar.value) {
        selectedContent.value = newConfig.contentOptions?.[0]?.value || ''
      } else {
        selectedContent.value = newConfig.contentOptions?.[0]?.value || ''
      }
      // 默认目标语言：如果对话框不展示语言选择器，则直接使用配置提供的默认值
      if (!newConfig.showTargetLanguages) {
        selectedLanguages.value = newConfig.defaultSelectedLanguages || []
      } else if (
        selectedLanguages.value.length === 0 &&
        newConfig.defaultSelectedLanguages?.length
      ) {
        // 对展示语言选择的场景，如第一次打开也同步默认值，后续用户切换时不覆盖
        selectedLanguages.value = newConfig.defaultSelectedLanguages
      }

      // 初始化expectedItemCount
      if (newConfig.expectedItemCount !== undefined) {
        expectedItemCount.value = newConfig.expectedItemCount
      }

      // 配置切换后重新计算数量，防止初始状态未更新
      updateExpectedCount()
    }
  },
  { immediate: true }
)

// 监听选择变化，动态计算可翻译数量
watch(
  [selectedScope, selectedContent, () => props.config?.context.selectedCount, selectedLanguages],
  () => {
    updateExpectedCount()
  },
  { immediate: true }
)

// 确认翻译
function confirmTranslate() {
  interface TranslateEmitData {
    scope: string
    languages: Language[]
    languageFilter?: string
    content?: string
    autoUpdateTranslated?: boolean
  }

  const emitData: TranslateEmitData = {
    scope: selectedScope.value,
    languages: selectedLanguages.value,
  }

  // Key翻译使用languageFilter作为语言选择
  if (isKeyTranslate.value) {
    emitData.languageFilter = selectedContent.value
    // 选择“全部”时允许覆盖已有译文
    emitData.autoUpdateTranslated = selectedContent.value === 'all'
  }

  // 批量翻译：将过滤选项映射为 autoUpdateTranslated
  // 'missing' -> false（跳过已有译文），'all' -> true（更新已有译文）
  if (isBatchTranslate.value || isBatchToolbar.value) {
    emitData.content = selectedContent.value
    emitData.autoUpdateTranslated = selectedContent.value === 'all'
  }

  // 单元格翻译默认允许覆盖已有译文
  if (isCellTranslate.value) {
    emitData.autoUpdateTranslated = true
  }

  emit('confirm', emitData)
}
</script>
