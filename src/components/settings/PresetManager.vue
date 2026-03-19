<template>
  <div :class="compact ? 'preset-manager--compact' : 'preset-manager'">
    <!-- 标题（仅非 compact 模式） -->
    <div v-if="!compact" style="font-weight: 600; margin-bottom: 8px">
      {{ $t('settings.language.presetManagement') }}
    </div>

    <!-- 方案选择与操作按钮 -->
    <div class="preset-manager__row">
      <el-select
        :model-value="currentSelectValue"
        @change="onPresetChange"
        :style="{ width: compact ? '180px' : '220px' }"
        size="small"
        :placeholder="$t('settings.language.currentPreset')"
      >
        <el-option
          v-if="presetStore.hasProjectConfig"
          :value="PROJECT_PRESET_ID"
          :label="`📁 ${projectConfigName}`"
        >
          <span style="display: flex; align-items: center; gap: 6px">
            <span>📁</span>
            <span style="font-weight: 500">{{ projectConfigName }}</span>
          </span>
        </el-option>
        <el-option
          v-for="preset in presetStore.presets"
          :key="preset.id"
          :value="preset.id"
          :label="preset.name"
        />
        <el-option :value="DEFAULT_PRESET_ID" :label="$t('settings.language.defaultPreset')" />
      </el-select>

      <el-button size="small" @click="openNameDialog('create')">
        {{ $t('settings.language.newPreset') }}
      </el-button>
      <el-button
        size="small"
        @click="openNameDialog('rename')"
        :disabled="!canEditCurrentPreset"
      >
        {{ $t('settings.language.renamePreset') }}
      </el-button>
      <el-button
        size="small"
        type="danger"
        plain
        @click="confirmDeleteVisible = true"
        :disabled="!canEditCurrentPreset"
      >
        {{ $t('settings.language.deletePreset') }}
      </el-button>
      <el-button size="small" @click="onExportPreset" :disabled="!hasActivePresetOrProject">
        {{ $t('settings.language.exportPreset') }}
      </el-button>
      <el-button size="small" @click="triggerImport">
        {{ $t('settings.language.importPreset') }}
      </el-button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        style="display: none"
        @change="onImportFile"
      />

      <!-- 项目配置保存（compact 模式下内联显示） -->
      <template v-if="compact && isProjectMode">
        <el-divider direction="vertical" />
        <el-button
          type="warning"
          size="small"
          @click="$emit('save-project-config')"
        >
          {{ $t('settings.language.saveToProject') }}
          <el-tag v-if="presetStore.isProjectConfigDirty" size="small" type="danger" style="margin-left: 6px">*</el-tag>
        </el-button>
      </template>
      <template v-if="compact && hasProject && !presetStore.hasProjectConfig">
        <el-divider direction="vertical" />
        <el-button size="small" type="info" plain @click="$emit('create-project-config')">
          {{ $t('settings.language.createProjectConfig') }}
        </el-button>
      </template>
    </div>

    <!-- 项目配置按钮（非 compact 模式下单独一行） -->
    <template v-if="!compact">
      <div v-if="isProjectMode" style="margin-bottom: 12px">
        <el-button
          type="warning"
          size="small"
          @click="$emit('save-project-config')"
        >
          {{ $t('settings.language.saveToProject') }}
          <el-tag v-if="presetStore.isProjectConfigDirty" size="small" type="danger" style="margin-left: 6px">*</el-tag>
        </el-button>
      </div>
      <div v-if="hasProject && !presetStore.hasProjectConfig" style="margin-bottom: 12px">
        <el-button size="small" type="info" plain @click="$emit('create-project-config')">
          {{ $t('settings.language.createProjectConfig') }}
        </el-button>
      </div>
    </template>
  </div>

  <!-- 名称输入对话框（新建/重命名共用） -->
  <el-dialog
    v-model="nameDialogVisible"
    :title="nameDialogMode === 'create' ? $t('settings.language.newPreset') : $t('settings.language.renamePreset')"
    width="400px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form @submit.prevent="submitNameDialog">
      <el-form-item :label="$t('settings.language.presetName')">
        <el-input
          ref="nameInputRef"
          v-model="nameDialogValue"
          :placeholder="$t('settings.language.presetNamePlaceholder')"
          @keyup.enter="submitNameDialog"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="nameDialogVisible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submitNameDialog" :disabled="!nameDialogValue.trim()">
        {{ $t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 删除确认对话框 -->
  <el-dialog
    v-model="confirmDeleteVisible"
    :title="$t('settings.language.deletePreset')"
    width="400px"
    append-to-body
  >
    <span>{{ $t('settings.language.confirmDeletePreset', { name: presetStore.activePreset?.name }) }}</span>
    <template #footer>
      <el-button @click="confirmDeleteVisible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="danger" @click="doDeletePreset">{{ $t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <!-- 导入同名选择对话框 -->
  <el-dialog
    v-model="importConflictVisible"
    :title="$t('settings.language.importConflictTitle')"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
  >
    <p>{{ $t('settings.language.importConflictMessage', { name: importConflictName }) }}</p>
    <template #footer>
      <el-button @click="importConflictVisible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" plain @click="resolveImportConflict('rename')">
        {{ $t('settings.language.importAutoRename') }}
      </el-button>
      <el-button type="warning" @click="resolveImportConflict('overwrite')">
        {{ $t('settings.language.importOverwrite') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePresetStore } from '@/stores/preset'
import { useProjectStore } from '@/stores/project'
import { PROJECT_PRESET_ID, DEFAULT_PRESET_ID } from '@/models/preset'
import type { Language } from '@/models/language'
import toast from '@/utils/toast'

const { t } = useI18n()
const presetStore = usePresetStore()
const projectStore = useProjectStore()

const props = defineProps<{
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'preset-changed'): void
  (e: 'save-project-config'): void
  (e: 'create-project-config'): void
  (e: 'unknown-languages', languages: string[]): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const nameInputRef = ref<InstanceType<typeof import('element-plus')['ElInput']> | null>(null)

const hasProject = computed(() => projectStore.hasProject)
const isProjectMode = computed(() => presetStore.isProjectPresetActive)

const currentSelectValue = computed(() => {
  if (presetStore.isProjectPresetActive) return PROJECT_PRESET_ID
  return presetStore.activePresetId ?? DEFAULT_PRESET_ID
})

const projectConfigName = computed(
  () => presetStore.projectConfig?.name || t('settings.language.projectPreset')
)

const canEditCurrentPreset = computed(() => {
  const id = presetStore.activePresetId
  return id !== null && id !== PROJECT_PRESET_ID && presetStore.presets.some(p => p.id === id)
})

const hasActivePresetOrProject = computed(() => {
  return presetStore.activePresetId !== null || presetStore.isProjectPresetActive
})

function onPresetChange(value: string) {
  const id = value === DEFAULT_PRESET_ID ? null : value
  presetStore.switchPreset(id)
  emit('preset-changed')
}

// ===== 名称对话框（新建/重命名共用）=====
const nameDialogVisible = ref(false)
const nameDialogMode = ref<'create' | 'rename'>('create')
const nameDialogValue = ref('')

function openNameDialog(mode: 'create' | 'rename') {
  nameDialogMode.value = mode
  nameDialogValue.value = mode === 'rename' && presetStore.activePreset
    ? presetStore.activePreset.name
    : ''
  nameDialogVisible.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

function submitNameDialog() {
  const name = nameDialogValue.value.trim()
  if (!name) return

  try {
    if (nameDialogMode.value === 'create') {
      presetStore.createPreset(name)
      toast.success(t('settings.language.presetCreated'))
    } else {
      if (!presetStore.activePreset) return
      presetStore.renamePreset(presetStore.activePreset.id, name)
      toast.success(t('settings.language.presetRenamed'))
    }
    nameDialogVisible.value = false
  } catch (err: any) {
    toast.error(err.message)
  }
}

// ===== 删除确认 =====
const confirmDeleteVisible = ref(false)

function doDeletePreset() {
  if (!presetStore.activePreset) return
  presetStore.deletePreset(presetStore.activePreset.id)
  toast.success(t('settings.language.presetDeleted'))
  confirmDeleteVisible.value = false
  emit('preset-changed')
}

// ===== 导出 =====
function onExportPreset() {
  const id = presetStore.isProjectPresetActive
    ? PROJECT_PRESET_ID
    : presetStore.activePresetId
  if (!id) return
  try {
    presetStore.exportPreset(id)
    toast.success(t('settings.language.presetExported'))
  } catch (err: any) {
    toast.error(err.message)
  }
}

// ===== 导入（含同名冲突处理）=====
function triggerImport() {
  fileInputRef.value?.click()
}

const importConflictVisible = ref(false)
const importConflictName = ref('')
/** 暂存待导入的语言数据和未知语言 */
let pendingImportData: { name: string; languages: Language[]; unknownLanguages: string[] } | null = null

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const result = await presetStore.parseImportFile(file)

    // 检查是否存在同名方案
    const existingPreset = presetStore.presets.find(p => p.name === result.name)
    if (existingPreset) {
      // 暂存数据，弹出冲突对话框
      pendingImportData = result
      importConflictName.value = result.name
      importConflictVisible.value = true
    } else {
      // 无冲突，直接创建
      presetStore.createPreset(result.name, result.languages)
      toast.success(t('settings.language.presetImported'))
      if (result.unknownLanguages.length > 0) {
        emit('unknown-languages', result.unknownLanguages)
      }
      emit('preset-changed')
    }
  } catch (err: any) {
    toast.error(err.message)
  } finally {
    input.value = ''
  }
}

function resolveImportConflict(action: 'overwrite' | 'rename') {
  if (!pendingImportData) return

  if (action === 'overwrite') {
    // 覆盖同名方案的语言列表
    const existing = presetStore.presets.find(p => p.name === pendingImportData!.name)
    if (existing) {
      presetStore.updatePresetLanguages(existing.id, pendingImportData.languages)
    }
  } else {
    // 自动重命名后创建
    presetStore.createPreset(pendingImportData.name, pendingImportData.languages)
  }

  toast.success(t('settings.language.presetImported'))
  if (pendingImportData.unknownLanguages.length > 0) {
    emit('unknown-languages', pendingImportData.unknownLanguages)
  }
  emit('preset-changed')

  importConflictVisible.value = false
  pendingImportData = null
}
</script>

<style scoped>
.preset-manager {
  margin-bottom: 20px;
}

.preset-manager--compact {
  margin-bottom: 10px;
  flex-shrink: 0;
}

.preset-manager__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.preset-manager--compact .preset-manager__row {
  margin-bottom: 0;
}
</style>
