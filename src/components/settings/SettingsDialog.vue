<template>
  <el-dialog
    :model-value="visible"
    :title="$t('settings.title')"
    width="860px"
    top="50px"
    :close-on-click-modal="false"
    :show-close="false"
    :lock-scroll="true"
    @close="closeDialog"
  >
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <div>
          <div style="font-size: 16px; font-weight: 600">{{ $t('settings.title') }}</div>
          <div style="font-size: 12px; color: var(--el-text-color-secondary)">
            {{ $t('settings.description') }}
          </div>
        </div>
        <el-button text circle @click="closeDialog">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane :label="$t('settings.tabs.general')" name="general">
        <el-form
          label-width="140px"
          :model="form"
          style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y"
        >
          <el-form-item :label="$t('settings.general.maxItemsPerRequest')">
            <el-input-number v-model="form.maxItemsPerRequest" :min="1" :max="100" />
          </el-form-item>
          <el-form-item :label="$t('settings.general.maxRetries')">
            <el-input-number v-model="form.maxRetries" :min="0" :max="10" />
          </el-form-item>
          <el-form-item :label="$t('settings.general.requestTimeout')">
            <el-input-number v-model="form.requestTimeout" :min="1000" :max="300000" :step="1000" />
          </el-form-item>
          <el-form-item :label="$t('settings.general.theme')">
            <el-radio-group v-model="form.theme">
              <el-radio-button value="light">{{
                $t('settings.general.themeLight')
              }}</el-radio-button>
              <el-radio-button value="dark">{{ $t('settings.general.themeDark') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane :label="$t('settings.tabs.language')" name="language">
        <div style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y">
          <!-- 默认源语言设置 -->
          <div style="margin-bottom: 20px">
            <div style="font-weight: 600; margin-bottom: 8px">
              {{ $t('settings.language.sourceLanguage') }}
            </div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px">
              {{ $t('settings.language.sourceLanguageHint') }}
            </div>
            <el-select v-model="selectedSourceLanguage" style="width: 300px">
              <el-option
                v-for="info in sourceLanguageOptions"
                :key="info.code"
                :label="sourceLangOptionLabel(info)"
                :value="info.code"
              />
            </el-select>
          </div>

          <el-alert type="info" show-icon :closable="false" style="margin-bottom: 16px">
            <template #title>
              {{ $t('settings.language.defaultLang') }}：<strong>{{
                sourceLanguageDisplayLabel
              }}</strong
              >{{ $t('settings.language.defaultLangSuffix') }}
            </template>
          </el-alert>

          <div style="margin-bottom: 20px">
            <div
              style="
                font-weight: 600;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <span>{{ $t('settings.language.enabledLanguages') }}</span>
              <div style="display: flex; gap: 8px">
                <el-button size="small" plain @click="addDefaultLanguages">
                  {{ $t('settings.language.addDefault') }}
                </el-button>
                <el-button size="small" type="primary" plain @click="addAllLanguages">
                  {{ $t('settings.language.addAll', { count: availableLangInfos.length }) }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :disabled="!enabledLangCodes.length"
                  @click="clearAllLanguages"
                >
                  {{ $t('settings.language.clear') }}
                </el-button>
              </div>
            </div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px">
              <span>{{ $t('settings.language.dragHint') }}</span>
            </div>
            <div
              style="
                min-height: 60px;
                padding: 12px;
                border: 1px solid var(--el-border-color);
                border-radius: 8px;
                background: var(--el-fill-color-lighter);
              "
            >
              <div
                v-if="enabledLangCodes.length === 0"
                style="color: var(--el-text-color-secondary); text-align: center; padding: 12px"
              >
                {{ $t('settings.language.noEnabledLanguages') }}
              </div>
              <div v-else style="display: flex; flex-wrap: wrap; gap: 8px">
                <el-tag
                  v-for="(code, idx) in enabledLangCodes"
                  :key="code"
                  closable
                  @close="removeLanguage(code)"
                  :draggable="true"
                  @dragstart="onDragStart($event, idx)"
                  @dragover.prevent
                  @drop="onDrop($event, idx)"
                >
                  {{ idx + 2 }}. {{ langLabel(code) }}
                </el-tag>
              </div>
            </div>
          </div>

          <div>
            <div style="font-weight: 600; margin-bottom: 8px">
              {{ $t('settings.language.availableLanguages') }}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <el-tag
                v-for="info in availableLangInfos"
                :key="info.code"
                type="info"
                effect="plain"
                @click="addLanguage(info.code)"
                style="cursor: pointer"
              >
                {{ langLabel(info.code) }}
              </el-tag>
            </div>
          </div>

          <!-- 自定义语言管理 -->
          <div style="margin-top: 30px">
            <el-divider content-position="left">
              <span style="font-weight: 600">{{
                $t('settings.language.customLanguageManagement')
              }}</span>
            </el-divider>
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                padding: 10px 12px;
                border: 1px solid var(--el-border-color-light);
                border-radius: 8px;
                background: var(--el-fill-color-lighter);
              "
            >
              <div style="min-width: 0">
                <div style="font-size: 13px; color: var(--el-text-color-regular)">
                  {{ $t('settings.language.customLanguageHint') }}
                </div>
                <div
                  style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px"
                >
                  {{
                    $t('settings.language.addedCustomLanguages', { count: customLanguages.length })
                  }}
                </div>
              </div>
              <el-button type="primary" size="small" @click="openCreateCustomLanguageDialog">
                {{ $t('settings.language.addCustomLanguage') }}
              </el-button>
            </div>

            <!-- 自定义语言列表 -->
            <div v-if="customLanguages.length > 0">
              <el-table :data="customLanguages" style="width: 100%" size="small" max-height="220">
                <el-table-column
                  prop="androidCode"
                  :label="$t('settings.language.androidCode')"
                  width="120"
                >
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.androidCode }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="nameCn"
                  :label="$t('settings.language.chineseName')"
                  width="150"
                />
                <el-table-column
                  prop="nameEn"
                  :label="$t('settings.language.englishName')"
                  width="150"
                />
                <el-table-column prop="valuesDirName" :label="$t('settings.language.valuesDir')">
                  <template #default="{ row }">
                    <code
                      style="
                        background: var(--el-fill-color-lighter);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 12px;
                      "
                    >
                      {{ row.valuesDirName || `values-${row.androidCode}` }}
                    </code>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('settings.language.actions')"
                  width="140"
                  align="center"
                >
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      size="small"
                      text
                      @click="startEditCustomLanguage(row)"
                    >
                      {{ $t('common.edit') }}
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      text
                      @click="removeCustomLanguage(row.androidCode)"
                    >
                      {{ $t('common.delete') }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div
              v-else
              style="text-align: center; color: var(--el-text-color-secondary); padding: 20px"
            >
              {{ $t('settings.language.noCustomLanguages') }}
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="$t('settings.tabs.ai')" name="ai">
        <div style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y">
          <div style="margin-bottom: 20px">
            <div style="font-weight: 600; margin-bottom: 12px">
              {{ $t('settings.ai.apiConfig') }}
            </div>
            <el-form label-width="140px" :model="form">
              <el-form-item :label="$t('settings.ai.apiUrl')">
                <el-input
                  v-model="form.apiUrl"
                  :placeholder="$t('settings.ai.apiUrlPlaceholder')"
                />
              </el-form-item>
              <el-form-item :label="$t('settings.ai.apiKey')">
                <el-input v-model="form.apiKey" type="password" show-password />
              </el-form-item>
              <el-form-item :label="$t('settings.ai.httpProxy')">
                <el-input v-model="form.httpProxy" placeholder="" disabled />
                <div
                  style="margin-top: 8px; font-size: 12px; color: var(--el-text-color-secondary)"
                >
                  <el-icon style="vertical-align: middle; margin-right: 4px"
                    ><InfoFilled
                  /></el-icon>
                  <span>{{ $t('settings.ai.proxyDisabledHint') }}</span>
                </div>
              </el-form-item>
            </el-form>
          </div>

          <div style="margin-bottom: 20px">
            <div style="font-weight: 600; margin-bottom: 12px">
              {{ $t('settings.ai.modelConfig') }}
            </div>
            <el-form label-width="100px" :model="form">
              <el-form-item :label="$t('settings.ai.modelName')">
                <el-select
                  v-model="form.aiModelPreset"
                  style="width: 100%"
                  popper-class="model-select-popper"
                >
                  <el-option
                    v-for="preset in modelPresets"
                    :key="preset.model"
                    :label="preset.model"
                    :value="preset.model"
                  >
                    <div class="model-option">
                      <span class="model-name">{{ preset.model }}</span>
                      <span v-if="preset.descKey" class="model-desc">
                        {{ getModelDescription(preset.descKey) }}
                      </span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item v-if="isCustomModel" :label="$t('settings.ai.customModelName')">
                <el-input
                  v-model="form.aiCustomModel"
                  :placeholder="$t('settings.ai.customModelPlaceholder')"
                />
              </el-form-item>
              <el-form-item>
                <el-button @click="onTest" :loading="testLoading">
                  {{ $t('settings.ai.testConnection') }}
                  <template v-if="testStatus">
                    <span style="margin-left: 8px">{{ testStatus }}</span>
                  </template>
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div>
            <div style="font-weight: 600; margin-bottom: 12px">
              {{ $t('settings.ai.promptConfig') }}
            </div>
            <el-form label-width="100px" :model="form">
              <el-form-item :label="$t('settings.ai.extraPrompt')">
                <el-input
                  v-model="form.aiPromptExtra"
                  type="textarea"
                  :rows="4"
                  :placeholder="$t('settings.ai.extraPromptPlaceholder')"
                />
              </el-form-item>
            </el-form>

            <div style="margin-top: 16px">
              <div
                style="
                  font-weight: 500;
                  margin-bottom: 8px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <span>{{ $t('settings.ai.singlePromptPreview') }}</span>
                <el-tag size="small" type="info">{{ $t('settings.ai.autoGenerated') }}</el-tag>
              </div>
              <pre
                style="
                  background: var(--el-fill-color-lighter);
                  border: 1px solid var(--el-border-color);
                  border-radius: 6px;
                  padding: 12px;
                  margin: 0;
                  white-space: pre-wrap;
                  font-family: 'JetBrains Mono', Consolas, monospace;
                  font-size: 11px;
                  line-height: 1.6;
                  color: var(--el-text-color-regular);
                  max-height: 150px;
                  overflow-y: auto;
                  touch-action: pan-y;
                "
                >{{ singlePromptPreview }}</pre
              >
            </div>

            <div style="margin-top: 16px">
              <div
                style="
                  font-weight: 500;
                  margin-bottom: 8px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <span>{{ $t('settings.ai.batchPromptPreview') }}</span>
                <el-tag size="small" type="info">{{ $t('settings.ai.autoGenerated') }}</el-tag>
              </div>
              <pre
                style="
                  background: var(--el-fill-color-lighter);
                  border: 1px solid var(--el-border-color);
                  border-radius: 6px;
                  padding: 12px;
                  margin: 0;
                  white-space: pre-wrap;
                  font-family: 'JetBrains Mono', Consolas, monospace;
                  font-size: 11px;
                  line-height: 1.6;
                  color: var(--el-text-color-regular);
                  max-height: 150px;
                  overflow-y: auto;
                  touch-action: pan-y;
                "
                >{{ batchPromptPreview }}</pre
              >
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">{{
          $t('settings.footer.hint')
        }}</span>
        <div>
          <el-button @click="closeDialog">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="onSave">{{ $t('common.save') }}</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog
    :model-value="customLangDialogVisible"
    :title="
      isEditingCustomLang
        ? $t('settings.language.editCustomLanguage')
        : $t('settings.language.addCustomLanguage')
    "
    width="420px"
    @close="closeCustomLangDialog"
  >
    <el-form label-width="96px" :model="customLangForm">
      <el-form-item :label="$t('settings.language.androidCode')">
        <el-input
          v-model="customLangForm.androidCode"
          :placeholder="$t('settings.language.androidCodePlaceholder')"
          :disabled="isEditingCustomLang"
          @blur="formatAndroidCode"
        />
        <div
          v-if="isEditingCustomLang"
          style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px"
        >
          {{ $t('settings.language.androidCodeReadonly') }}
        </div>
      </el-form-item>
      <el-form-item :label="$t('settings.language.chineseName')">
        <el-input
          v-model="customLangForm.nameCn"
          :placeholder="$t('settings.language.chineseNamePlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="$t('settings.language.englishName')">
        <el-input
          v-model="customLangForm.nameEn"
          :placeholder="$t('settings.language.englishNamePlaceholder')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeCustomLangDialog">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submitCustomLanguage" :disabled="customLangSubmitDisabled">
        {{ isEditingCustomLang ? $t('common.save') : $t('common.add') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Close, InfoFilled } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { useTranslationStore } from '@/stores/translation'
import {
  LANGUAGE,
  type Language,
  getDefaultEnabledBuiltinLanguages,
  getLanguageLabel,
  getSourceLanguageLabel,
  type CustomLanguage,
  type FullLanguageInfo,
} from '@/models/language'
import {
  AI_MODEL_PRESETS,
  BATCH_PROMPT_TEMPLATE,
  SINGLE_PROMPT_TEMPLATE,
  renderPromptTemplate,
} from '@/models/ai'
import toast from '@/utils/toast'

const { t, locale } = useI18n()

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const configStore = useConfigStore()
const translationStore = useTranslationStore()

const form = computed({
  get: () => configStore.config,
  set: v => configStore.updateBatch(v),
})

const activeTab = ref('general')
const defLang = LANGUAGE.DEF

// 默认源语言选择
const selectedSourceLanguage = ref<Language>(LANGUAGE.DEF)

const allLangInfos = computed(() => configStore.getAllAvailableLanguages())

// 源语言选项：内置的 'def' (英文) + 所有可用的非默认语言
const sourceLanguageOptions = computed(() => {
  const options: FullLanguageInfo[] = []
  // 添加默认选项（英文）
  options.push({
    code: LANGUAGE.DEF,
    androidCode: '',
    nameCn: '默认(英文)',
    nameEn: 'Default(English)',
    valuesDirName: 'values',
    isDefault: true,
  })
  // 添加所有可用语言（排除 DEF）
  for (const info of allLangInfos.value) {
    if (info.code !== LANGUAGE.DEF) {
      options.push(info)
    }
  }
  return options
})

// 源语言选项显示标签
const sourceLangOptionLabel = (info: FullLanguageInfo) => {
  const localeType = locale.value === 'en' ? 'en' : 'cn'
  const name = localeType === 'cn' ? info.nameCn : info.nameEn
  if (info.code === LANGUAGE.DEF) {
    return name
  }
  return `${name} (${info.androidCode || info.valuesDirName})`
}

// 当前选择的源语言显示标签
const sourceLanguageDisplayLabel = computed(() => {
  const localeType = locale.value === 'en' ? 'en' : 'cn'
  return getSourceLanguageLabel(selectedSourceLanguage.value, localeType)
})

const langLabel = (lang: Language) => {
  return getLanguageLabel(lang, locale.value === 'en' ? 'en' : 'cn')
}

// Language management
const enabledLangCodes = ref<Language[]>([])
const dragIndex = ref<number | null>(null)

const availableLangInfos = computed(() => {
  return allLangInfos.value.filter(
    info => info.code !== defLang && !enabledLangCodes.value.includes(info.code)
  )
})

function addLanguage(code: Language) {
  enabledLangCodes.value = [...enabledLangCodes.value, code]
}

function removeLanguage(code: Language) {
  enabledLangCodes.value = enabledLangCodes.value.filter(c => c !== code)
}

function addAllLanguages() {
  enabledLangCodes.value = allLangInfos.value.filter(l => l.code !== defLang).map(l => l.code)
}

function addDefaultLanguages() {
  const merged = new Set([
    ...enabledLangCodes.value,
    ...getDefaultEnabledBuiltinLanguages().filter(code => code !== defLang),
  ])
  enabledLangCodes.value = Array.from(merged)
}

function clearAllLanguages() {
  enabledLangCodes.value = []
}

function onDragStart(_event: DragEvent, index: number) {
  dragIndex.value = index
}

function onDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()
  if (dragIndex.value === null || dragIndex.value === targetIndex) return

  const codes = enabledLangCodes.value.slice()
  const [moved] = codes.splice(dragIndex.value, 1)
  codes.splice(targetIndex, 0, moved)
  enabledLangCodes.value = codes
  dragIndex.value = null
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      activeTab.value = 'general'
      const current = form.value.enabledLanguages || []
      enabledLangCodes.value = current.filter(l => l !== LANGUAGE.DEF)
      // 加载当前配置的源语言
      selectedSourceLanguage.value = form.value.defaultSourceLanguage || LANGUAGE.DEF
    }
  }
)

const modelPresets = computed(() => {
  return Object.entries(AI_MODEL_PRESETS).map(([model, descKey]) => ({
    model,
    descKey,
  }))
})
const isCustomModel = computed(() => form.value.aiModelPreset === 'custom')

// 获取模型描述
function getModelDescription(descKey: string): string {
  if (!descKey) return ''
  const key = `settings.ai.modelDesc.${descKey}`
  return t(key)
}

const singlePromptPreview = computed(() => {
  const extra = form.value.aiPromptExtra?.trim()
    ? `- Additional context: ${form.value.aiPromptExtra.trim()}\n`
    : `${t('settings.ai.placeholder.optionalPrompt')}\n`
  return renderPromptTemplate(SINGLE_PROMPT_TEMPLATE, {
    sourceLanguage: t('settings.ai.placeholder.sourceLanguage'),
    targetLanguage: t('settings.ai.placeholder.targetLanguage'),
    contextBlock: `Context: This is an Android string resource named "${t('settings.ai.placeholder.resourceId')}".\n\n`,
    text: t('settings.ai.placeholder.originalText'),
    extraPromptBlock: extra,
  })
})

const batchPromptPreview = computed(() => {
  const extra = form.value.aiPromptExtra?.trim()
    ? `- Additional context: ${form.value.aiPromptExtra.trim()}\n`
    : `${t('settings.ai.placeholder.optionalPrompt')}\n`
  return renderPromptTemplate(BATCH_PROMPT_TEMPLATE, {
    sourceLanguage: t('settings.ai.placeholder.sourceLanguage'),
    targetLanguage: t('settings.ai.placeholder.targetLanguage'),
    textsJson: JSON.stringify(
      {
        title: `${t('settings.ai.placeholder.originalText')} 1`,
        description: `${t('settings.ai.placeholder.originalText')} 2`,
      },
      null,
      2
    ),
    extraPromptBlock: extra,
    contextBlock: '',
    text: '',
  })
})

const testLoading = ref(false)
const testStatus = ref('')

async function onTest() {
  testLoading.value = true
  testStatus.value = t('settings.ai.testing')

  try {
    const ok = await translationStore.testConnection()
    testStatus.value = ok ? t('settings.ai.connectionSuccess') : t('settings.ai.connectionFailed')
  } catch (error: any) {
    testStatus.value = t('settings.ai.connectionFailed')
    toast.fromError(error, t('settings.ai.connectionFailed'))
  } finally {
    testLoading.value = false
  }
}

watch(
  () => [
    form.value.apiUrl,
    form.value.apiKey,
    form.value.httpProxy,
    form.value.aiModelPreset,
    form.value.aiCustomModel,
  ],
  () => {
    testStatus.value = ''
  }
)

async function onSave() {
  try {
    const langs: Language[] = [LANGUAGE.DEF, ...enabledLangCodes.value]
    configStore.update('enabledLanguages', langs)
    // 保存源语言设置
    configStore.update('defaultSourceLanguage', selectedSourceLanguage.value)
    await configStore.save()
    toast.success(t('settings.toast.saved'))
    closeDialog()
  } catch (error: any) {
    toast.fromError(error, t('settings.toast.saveFailed'))
  }
}

function closeDialog() {
  emit('update:visible', false)
}

// ========== 自定义语言管理 ==========
const customLanguages = ref<CustomLanguage[]>([])
const customLangDialogVisible = ref(false)

const customLangForm = ref<CustomLanguage>({
  androidCode: '',
  nameCn: '',
  nameEn: '',
})

// 是否正在编辑自定义语言
const isEditingCustomLang = ref(false)
const editingAndroidCode = ref<string | null>(null)

const canAddCustomLang = computed(() => {
  return (
    customLangForm.value.androidCode.trim() &&
    customLangForm.value.nameCn.trim() &&
    customLangForm.value.nameEn.trim()
  )
})

const canSaveCustomLang = computed(() => {
  return customLangForm.value.nameCn.trim() && customLangForm.value.nameEn.trim()
})

const customLangSubmitDisabled = computed(() => {
  return isEditingCustomLang.value ? !canSaveCustomLang.value : !canAddCustomLang.value
})

function formatAndroidCode() {
  // 自动转换为小写
  customLangForm.value.androidCode = customLangForm.value.androidCode.toLowerCase()
}

function resetCustomLangForm() {
  customLangForm.value = {
    androidCode: '',
    nameCn: '',
    nameEn: '',
  }
  isEditingCustomLang.value = false
  editingAndroidCode.value = null
}

function openCreateCustomLanguageDialog() {
  resetCustomLangForm()
  customLangDialogVisible.value = true
}

function startEditCustomLanguage(row: CustomLanguage) {
  customLangForm.value = {
    androidCode: row.androidCode,
    nameCn: row.nameCn,
    nameEn: row.nameEn,
  }
  isEditingCustomLang.value = true
  editingAndroidCode.value = row.androidCode
  customLangDialogVisible.value = true
}

function closeCustomLangDialog() {
  customLangDialogVisible.value = false
  resetCustomLangForm()
}

function saveEditCustomLanguage() {
  if (!canSaveCustomLang.value || !editingAndroidCode.value) {
    toast.warning(t('settings.toast.fillComplete'))
    return
  }

  try {
    configStore.updateCustomLanguage(editingAndroidCode.value, {
      nameCn: customLangForm.value.nameCn.trim(),
      nameEn: customLangForm.value.nameEn.trim(),
    })

    // 刷新自定义语言列表
    customLanguages.value = configStore
      .getAllAvailableLanguages()
      .filter(l => !l.isDefault)
      .map(l => ({
        androidCode: l.androidCode,
        nameCn: l.nameCn,
        nameEn: l.nameEn,
        valuesDirName: l.valuesDirName,
      }))

    toast.success(t('settings.toast.customLanguageUpdated'))
    closeCustomLangDialog()
  } catch (error: any) {
    toast.error(error.message || t('settings.toast.customLanguageUpdateFailed'))
  }
}

function addCustomLanguage() {
  if (!canAddCustomLang.value) {
    toast.warning(t('settings.toast.fillComplete'))
    return
  }

  try {
    const langData: CustomLanguage = {
      androidCode: customLangForm.value.androidCode.trim(),
      nameCn: customLangForm.value.nameCn.trim(),
      nameEn: customLangForm.value.nameEn.trim(),
    }

    configStore.addCustomLanguage(langData)
    if (!enabledLangCodes.value.includes(langData.androidCode)) {
      enabledLangCodes.value = [...enabledLangCodes.value, langData.androidCode]
    }
    customLanguages.value = configStore
      .getAllAvailableLanguages()
      .filter(l => !l.isDefault)
      .map(l => ({
        androidCode: l.androidCode,
        nameCn: l.nameCn,
        nameEn: l.nameEn,
        valuesDirName: l.valuesDirName,
      }))

    toast.success(t('settings.toast.customLanguageAdded'))
    closeCustomLangDialog()
  } catch (error: any) {
    toast.error(error.message || t('settings.toast.customLanguageAddFailed'))
  }
}

function submitCustomLanguage() {
  if (isEditingCustomLang.value) {
    saveEditCustomLanguage()
    return
  }
  addCustomLanguage()
}

function removeCustomLanguage(androidCode: string) {
  try {
    configStore.removeCustomLanguage(androidCode)
    enabledLangCodes.value = enabledLangCodes.value.filter(code => code !== androidCode)
    customLanguages.value = customLanguages.value.filter(l => l.androidCode !== androidCode)
    toast.success(t('settings.toast.customLanguageDeleted'))
  } catch (error: any) {
    toast.error(error.message || t('settings.toast.customLanguageDeleteFailed'))
  }
}

// 加载自定义语言列表
function loadCustomLanguages() {
  customLanguages.value = configStore
    .getAllAvailableLanguages()
    .filter(l => !l.isDefault)
    .map(l => ({
      androidCode: l.androidCode,
      nameCn: l.nameCn,
      nameEn: l.nameEn,
      valuesDirName: l.valuesDirName,
    }))
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      activeTab.value = 'general'
      const current = form.value.enabledLanguages || []
      enabledLangCodes.value = current.filter(l => l !== LANGUAGE.DEF)
      loadCustomLanguages()
    }
  }
)
</script>

<style>
/* 全局样式：模型选择器下拉框（popper 挂载在 body 下，需要全局样式） */
.model-select-popper .el-select-dropdown__item {
  height: auto !important;
  padding: 8px 12px !important;
  line-height: 1.4 !important;
}

.model-select-popper .el-select-dropdown__item .model-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-select-popper .el-select-dropdown__item .model-name {
  font-weight: 500;
}

.model-select-popper .el-select-dropdown__item .model-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}
</style>
