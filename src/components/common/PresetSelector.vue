<template>
  <el-select
    :model-value="currentValue"
    @change="onSwitch"
    size="small"
    style="width: 180px"
    :placeholder="$t('settings.language.currentPreset')"
  >
    <!-- 项目配置选项 -->
    <el-option
      v-if="presetStore.hasProjectConfig"
      :value="PROJECT_PRESET_ID"
      :label="`📁 ${projectConfigName}`"
    >
      <span style="display: flex; align-items: center; gap: 6px">
        <span>📁</span>
        <span>{{ projectConfigName }}</span>
        <el-tag v-if="presetStore.isProjectConfigDirty" size="small" type="warning" style="margin-left: auto">*</el-tag>
      </span>
    </el-option>

    <!-- 用户方案列表 -->
    <el-option
      v-for="preset in presetStore.presets"
      :key="preset.id"
      :value="preset.id"
      :label="preset.name"
    />

    <!-- 默认方案 -->
    <el-option :value="DEFAULT_PRESET_ID" :label="$t('settings.language.defaultPreset')">
      {{ $t('settings.language.defaultPreset') }}
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePresetStore } from '@/stores/preset'
import { PROJECT_PRESET_ID, DEFAULT_PRESET_ID } from '@/models/preset'
import toast from '@/utils/toast'

const { t } = useI18n()
const presetStore = usePresetStore()
const emit = defineEmits<{
  (e: 'preset-switched'): void
}>()

const currentValue = computed(() => {
  if (presetStore.isProjectPresetActive) return PROJECT_PRESET_ID
  return presetStore.activePresetId ?? DEFAULT_PRESET_ID
})

const projectConfigName = computed(
  () => presetStore.projectConfig?.name || t('settings.language.projectPreset')
)

async function onSwitch(value: string) {
  if (presetStore.isProjectConfigDirty && presetStore.isProjectPresetActive) {
    const confirmed = window.confirm(t('settings.language.unsavedChanges'))
    if (confirmed) {
      try {
        await presetStore.saveProjectConfig()
      } catch {
        toast.error(t('settings.language.projectConfigSaveFailed'))
        return
      }
    }
  }

  const id = value === DEFAULT_PRESET_ID ? null : value
  presetStore.switchPreset(id)
  toast.success(t('settings.language.presetSwitched'))
  emit('preset-switched')
}
</script>
