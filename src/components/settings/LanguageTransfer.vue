<template>
  <div class="lang-transfer">
    <!-- 左侧：可选语言 -->
    <div class="lang-transfer__panel">
      <div class="lang-transfer__header">
        <el-checkbox
          :model-value="isAllAvailableChecked"
          :indeterminate="isAvailableIndeterminate"
          @change="toggleAllAvailable"
        >
          {{ $t('settings.language.availableLanguages') }}
        </el-checkbox>
        <span class="lang-transfer__count">{{ availableChecked.length }}/{{ availableList.length }}</span>
      </div>
      <div class="lang-transfer__search">
        <el-input
          v-model="availableSearch"
          size="small"
          :placeholder="$t('settings.language.searchLanguage')"
          clearable
          :prefix-icon="Search"
        />
      </div>
      <div class="lang-transfer__body">
        <div v-if="filteredAvailableList.length === 0" class="lang-transfer__empty">
          {{ $t('common.noData') }}
        </div>
        <el-checkbox-group v-else v-model="availableChecked">
          <div
            v-for="info in filteredAvailableList"
            :key="info.code"
            class="lang-transfer__item"
          >
            <el-checkbox :value="info.code">
              <span class="lang-transfer__label">{{ langName(info) }}</span>
              <span class="lang-transfer__code">{{ info.androidCode || info.code }}</span>
            </el-checkbox>
          </div>
        </el-checkbox-group>
      </div>
    </div>

    <!-- 中间：操作按钮 -->
    <div class="lang-transfer__actions">
      <el-button
        :icon="ArrowRight"
        :disabled="availableChecked.length === 0"
        @click="addSelected"
        size="small"
        type="primary"
      />
      <el-button
        :icon="ArrowLeft"
        :disabled="enabledChecked.length === 0"
        @click="removeSelected"
        size="small"
        type="primary"
      />
      <el-divider style="margin: 8px 0" />
      <el-button size="small" @click="$emit('add-default')" :title="$t('settings.language.addDefault')">
        {{ $t('settings.language.addDefault') }}
      </el-button>
      <el-button size="small" @click="addAll" :title="$t('settings.language.addAll', { count: availableList.length })">
        {{ $t('common.all') }}
      </el-button>
      <el-button size="small" @click="$emit('clear')" :title="$t('settings.language.clear')">
        {{ $t('settings.language.clear') }}
      </el-button>
    </div>

    <!-- 右侧：已选语言（支持拖拽排序） -->
    <div class="lang-transfer__panel">
      <div class="lang-transfer__header">
        <el-checkbox
          :model-value="isAllEnabledChecked"
          :indeterminate="isEnabledIndeterminate"
          @change="toggleAllEnabled"
        >
          {{ $t('settings.language.enabledLanguages') }}
        </el-checkbox>
        <span class="lang-transfer__count">{{ enabledChecked.length }}/{{ enabledList.length }}</span>
      </div>
      <div class="lang-transfer__search">
        <el-input
          v-model="enabledSearch"
          size="small"
          :placeholder="$t('settings.language.searchLanguage')"
          clearable
          :prefix-icon="Search"
        />
      </div>
      <div class="lang-transfer__body">
        <div v-if="enabledList.length === 0" class="lang-transfer__empty">
          {{ $t('settings.language.noEnabledLanguages') }}
        </div>
        <template v-else>
          <div
            v-for="(info, idx) in filteredEnabledList"
            :key="info.code"
            class="lang-transfer__item lang-transfer__item--sortable"
            :class="{ 'lang-transfer__item--drag-over': dragOverIndex === idx }"
            :draggable="true"
            @dragstart="onDragStart($event, idx, info.code)"
            @dragover.prevent="onDragOver(idx)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, idx)"
            @dragend="onDragEnd"
          >
            <el-checkbox
              :model-value="enabledChecked.includes(info.code)"
              @change="(val: boolean) => toggleEnabledCheck(info.code, val)"
            >
              <span class="lang-transfer__order">{{ getOriginalIndex(info.code) + 1 }}.</span>
              <span class="lang-transfer__label">{{ langName(info) }}</span>
              <span class="lang-transfer__code">{{ info.androidCode || info.code }}</span>
            </el-checkbox>
            <el-icon class="lang-transfer__grip"><Rank /></el-icon>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, ArrowLeft, ArrowRight, Rank } from '@element-plus/icons-vue'
import type { Language } from '@/models/language'
import type { FullLanguageInfo } from '@/models/language'

const { locale } = useI18n()

const props = defineProps<{
  /** 所有可用语言信息列表（不含 DEF） */
  allLanguages: FullLanguageInfo[]
  /** 当前已启用的语言列表（不含 DEF） */
  modelValue: Language[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Language[]): void
  (e: 'add-default'): void
  (e: 'clear'): void
}>()

// ===== 搜索 =====
const availableSearch = ref('')
const enabledSearch = ref('')

// ===== 勾选状态 =====
const availableChecked = ref<Language[]>([])
const enabledChecked = ref<Language[]>([])

// ===== 计算列表 =====
const availableList = computed(() =>
  props.allLanguages.filter(info => !props.modelValue.includes(info.code))
)

const enabledList = computed(() => {
  const infos: FullLanguageInfo[] = []
  for (const code of props.modelValue) {
    const info = props.allLanguages.find(l => l.code === code)
    if (info) infos.push(info)
  }
  return infos
})

const filteredAvailableList = computed(() => {
  const q = availableSearch.value.trim().toLowerCase()
  if (!q) return availableList.value
  return availableList.value.filter(info => matchSearch(info, q))
})

const filteredEnabledList = computed(() => {
  const q = enabledSearch.value.trim().toLowerCase()
  if (!q) return enabledList.value
  return enabledList.value.filter(info => matchSearch(info, q))
})

function matchSearch(info: FullLanguageInfo, query: string): boolean {
  return (
    info.nameCn.toLowerCase().includes(query) ||
    info.nameEn.toLowerCase().includes(query) ||
    info.code.toLowerCase().includes(query) ||
    info.androidCode.toLowerCase().includes(query)
  )
}

function langName(info: FullLanguageInfo): string {
  return locale.value === 'en' ? info.nameEn : info.nameCn
}

function getOriginalIndex(code: Language): number {
  return props.modelValue.indexOf(code)
}

// ===== 全选逻辑 =====
const isAllAvailableChecked = computed(() =>
  availableList.value.length > 0 && availableChecked.value.length === availableList.value.length
)
const isAvailableIndeterminate = computed(() =>
  availableChecked.value.length > 0 && availableChecked.value.length < availableList.value.length
)

const isAllEnabledChecked = computed(() =>
  enabledList.value.length > 0 && enabledChecked.value.length === enabledList.value.length
)
const isEnabledIndeterminate = computed(() =>
  enabledChecked.value.length > 0 && enabledChecked.value.length < enabledList.value.length
)

function toggleAllAvailable(checked: boolean | string | number) {
  availableChecked.value = checked ? availableList.value.map(l => l.code) : []
}

function toggleAllEnabled(checked: boolean | string | number) {
  enabledChecked.value = checked ? enabledList.value.map(l => l.code) : []
}

function toggleEnabledCheck(code: Language, checked: boolean) {
  if (checked) {
    enabledChecked.value = [...enabledChecked.value, code]
  } else {
    enabledChecked.value = enabledChecked.value.filter(c => c !== code)
  }
}

// ===== 添加/移除 =====
function addSelected() {
  const newList = [...props.modelValue, ...availableChecked.value]
  emit('update:modelValue', newList)
  availableChecked.value = []
}

function removeSelected() {
  const toRemove = new Set(enabledChecked.value)
  const newList = props.modelValue.filter(code => !toRemove.has(code))
  emit('update:modelValue', newList)
  enabledChecked.value = []
}

function addAll() {
  const allCodes = props.allLanguages.map(l => l.code)
  emit('update:modelValue', allCodes)
  availableChecked.value = []
}

// ===== 拖拽排序 =====
const dragIndex = ref<number | null>(null)
const dragCode = ref<Language | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(_event: DragEvent, index: number, code: Language) {
  dragIndex.value = index
  dragCode.value = code
}

function onDragOver(index: number) {
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(_event: DragEvent, targetIndex: number) {
  if (dragCode.value === null) return

  // 在 filteredEnabledList 中拖拽时，需要映射回原始索引
  const fromCode = dragCode.value
  const targetCode = filteredEnabledList.value[targetIndex]?.code
  if (!targetCode || fromCode === targetCode) return

  const codes = [...props.modelValue]
  const fromOrigIdx = codes.indexOf(fromCode)
  const toOrigIdx = codes.indexOf(targetCode)
  if (fromOrigIdx < 0 || toOrigIdx < 0) return

  codes.splice(fromOrigIdx, 1)
  codes.splice(toOrigIdx, 0, fromCode)
  emit('update:modelValue', codes)

  dragIndex.value = null
  dragCode.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dragCode.value = null
  dragOverIndex.value = null
}
</script>

<style scoped>
.lang-transfer {
  display: flex;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.lang-transfer__panel {
  flex: 1;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
}

.lang-transfer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
  border-radius: 8px 8px 0 0;
}

.lang-transfer__count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.lang-transfer__search {
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.lang-transfer__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 4px 0;
}

.lang-transfer__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.lang-transfer__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  transition: background-color 0.15s;
}

.lang-transfer__item:hover {
  background: var(--el-fill-color-light);
}

.lang-transfer__item--sortable {
  cursor: grab;
}

.lang-transfer__item--sortable:active {
  cursor: grabbing;
}

.lang-transfer__item--drag-over {
  border-top: 2px solid var(--el-color-primary);
}

.lang-transfer__label {
  margin-right: 4px;
}

.lang-transfer__code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.lang-transfer__order {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-right: 2px;
  min-width: 20px;
  display: inline-block;
}

.lang-transfer__grip {
  color: var(--el-text-color-placeholder);
  cursor: grab;
  font-size: 14px;
  flex-shrink: 0;
}

.lang-transfer__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 8px;
  padding: 0 4px;
  width: 90px;
  flex-shrink: 0;
  align-self: center;
}

.lang-transfer__actions :deep(.el-button) {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-left: 0;
}
</style>
