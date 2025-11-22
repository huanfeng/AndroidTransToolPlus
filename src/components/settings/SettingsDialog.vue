<template>
  <el-dialog
    :model-value="visible"
    title="应用设置"
    width="860px"
    top="50px"
    :close-on-click-modal="false"
    :show-close="false"
    :lock-scroll="true"
    @close="closeDialog"
  >
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div>
          <div style="font-size: 16px; font-weight: 600;">应用设置</div>
          <div style="font-size: 12px; color: var(--el-text-color-secondary);">配置接口、语言顺序以及 AI 翻译参数</div>
        </div>
        <el-button text circle @click="closeDialog">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="基础" name="general">
        <el-form label-width="140px" :model="form" style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y;">
          <el-form-item label="每批最大条目">
            <el-input-number v-model="form.maxItemsPerRequest" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="最大重试次数">
            <el-input-number v-model="form.maxRetries" :min="0" :max="10" />
          </el-form-item>
          <el-form-item label="请求超时(ms)">
            <el-input-number v-model="form.requestTimeout" :min="1000" :max="300000" :step="1000" />
          </el-form-item>
          <el-form-item label="主题">
            <el-radio-group v-model="form.theme">
              <el-radio-button value="light">浅色</el-radio-button>
              <el-radio-button value="dark">深色</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="语言" name="language">
        <div style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y;">
          <el-alert
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          >
            <template #title>
              默认语言：<strong>{{ langLabel(defLang) }}</strong>（始终第一位）
            </template>
          </el-alert>

          <div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span>已启用语言</span>
              <div style="display: flex; gap: 8px;">
                <el-button size="small" type="primary" plain @click="addAllLanguages">
                  添加全部 ({{ availableLangCodes.length }})
                </el-button>
                <el-button size="small" type="danger" plain :disabled="!enabledLangCodes.length" @click="clearAllLanguages">
                  清空
                </el-button>
              </div>
            </div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px;">
              <span>拖拽可调整顺序，点击 × 可移除</span>
            </div>
            <div style="min-height: 60px; padding: 12px; border: 1px solid var(--el-border-color); border-radius: 8px; background: var(--el-fill-color-lighter);">
              <div v-if="enabledLangCodes.length === 0" style="color: var(--el-text-color-secondary); text-align: center; padding: 12px;">
                尚未启用其他语言
              </div>
              <div v-else style="display: flex; flex-wrap: wrap; gap: 8px;">
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
            <div style="font-weight: 600; margin-bottom: 8px;">可启用的语言</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <el-tag
                v-for="code in availableLangCodes"
                :key="code"
                type="info"
                effect="plain"
                @click="addLanguage(code)"
                style="cursor: pointer;"
              >
                {{ langLabel(code) }}
              </el-tag>
            </div>
          </div>

          <!-- 自定义语言管理 -->
          <div style="margin-top: 30px;">
            <el-divider content-position="left">
              <span style="font-weight: 600;">自定义语言管理</span>
            </el-divider>

            <el-alert
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom: 16px;"
            >
              <template #title>
                支持添加任意 Android 语言代码（如 th, vi, es 等）
              </template>
            </el-alert>

            <!-- 添加自定义语言表单 -->
            <div style="margin-bottom: 20px;">
              <div style="font-weight: 600; margin-bottom: 12px;">添加自定义语言</div>
              <el-form label-width="120px" :model="customLangForm" style="background: var(--el-fill-color-lighter); padding: 16px; border-radius: 8px;">
                <el-form-item label="Android 代码">
                  <el-input
                    v-model="customLangForm.androidCode"
                    placeholder="例如：th, vi, es"
                    style="width: 200px;"
                    @blur="formatAndroidCode"
                  />
                </el-form-item>
                <el-form-item label="中文名称">
                  <el-input
                    v-model="customLangForm.nameCn"
                    placeholder="例如：泰语、越南语"
                    style="width: 200px;"
                  />
                </el-form-item>
                <el-form-item label="英文名称">
                  <el-input
                    v-model="customLangForm.nameEn"
                    placeholder="例如：Thai, Vietnamese"
                    style="width: 200px;"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="addCustomLanguage" :disabled="!canAddCustomLang">
                    添加语言
                  </el-button>
                  <el-button @click="resetCustomLangForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 自定义语言列表 -->
            <div v-if="customLanguages.length > 0">
              <div style="font-weight: 600; margin-bottom: 12px;">
                已添加的自定义语言 ({{ customLanguages.length }})
              </div>
              <el-table :data="customLanguages" style="width: 100%;" size="small">
                <el-table-column prop="androidCode" label="Android 代码" width="120">
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.androidCode }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="nameCn" label="中文名称" width="150" />
                <el-table-column prop="nameEn" label="英文名称" width="150" />
                <el-table-column prop="valuesDirName" label="Values 目录">
                  <template #default="{ row }">
                    <code style="background: var(--el-fill-color-lighter); padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                      {{ row.valuesDirName || `values-${row.androidCode}` }}
                    </code>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" align="center">
                  <template #default="{ row }">
                    <el-button
                      type="danger"
                      size="small"
                      text
                      @click="removeCustomLanguage(row.androidCode)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div v-else style="text-align: center; color: var(--el-text-color-secondary); padding: 20px;">
              暂无自定义语言
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI" name="ai">
        <div style="padding: 16px 20px; max-height: 400px; overflow-y: auto; touch-action: pan-y;">
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 12px;">API 配置</div>
            <el-form label-width="140px" :model="form">
              <el-form-item label="API URL">
                <el-input v-model="form.apiUrl" placeholder="https://api.openai.com/v1" />
              </el-form-item>
              <el-form-item label="API Key">
                <el-input v-model="form.apiKey" type="password" show-password />
              </el-form-item>
              <el-form-item label="HTTP 代理">
                <el-input v-model="form.httpProxy" placeholder="http://127.0.0.1:7890" />
              </el-form-item>
            </el-form>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 12px;">模型配置</div>
            <el-form label-width="100px" :model="form">
              <el-form-item label="模型名称">
                <el-select v-model="form.aiModelPreset" style="width: 100%;">
                  <el-option
                    v-for="preset in modelPresets"
                    :key="preset.model"
                    :label="getModelLabel(preset.model)"
                    :value="preset.model"
                  >
                    <div style="display: flex; flex-direction: column;">
                      <span style="font-weight: 500;">{{ getModelLabel(preset.model) }}</span>
                      <small style="color: var(--el-text-color-secondary);">{{ preset.description }}</small>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item v-if="isCustomModel" label="自定义名称">
                <el-input v-model="form.aiCustomModel" placeholder="gpt-4-turbo / claude-3-opus ..." />
              </el-form-item>
              <el-form-item>
                <el-button @click="onTest" :loading="testLoading">
                  测试连接
                  <template v-if="testStatus">
                    <span style="margin-left: 8px;">{{ testStatus }}</span>
                  </template>
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div>
            <div style="font-weight: 600; margin-bottom: 12px;">提示词配置</div>
            <el-form label-width="100px" :model="form">
              <el-form-item label="补充提示词">
                <el-input
                  v-model="form.aiPromptExtra"
                  type="textarea"
                  :rows="4"
                  placeholder="例如：这些文案用于电商 App，请使用贴合购物场景的表达。"
                />
              </el-form-item>
            </el-form>

            <div style="margin-top: 16px;">
              <div style="font-weight: 500; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>单条翻译提示预览</span>
                <el-tag size="small" type="info">系统自动生成</el-tag>
              </div>
              <pre style="background: var(--el-fill-color-lighter); border: 1px solid var(--el-border-color); border-radius: 6px; padding: 12px; margin: 0; white-space: pre-wrap; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; line-height: 1.6; color: var(--el-text-color-regular); max-height: 150px; overflow-y: auto; touch-action: pan-y;">{{ singlePromptPreview }}</pre>
            </div>

            <div style="margin-top: 16px;">
              <div style="font-weight: 500; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>批量翻译提示预览</span>
                <el-tag size="small" type="info">系统自动生成</el-tag>
              </div>
              <pre style="background: var(--el-fill-color-lighter); border: 1px solid var(--el-border-color); border-radius: 6px; padding: 12px; margin: 0; white-space: pre-wrap; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11px; line-height: 1.6; color: var(--el-text-color-regular); max-height: 150px; overflow-y: auto; touch-action: pan-y;">{{ batchPromptPreview }}</pre>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span style="font-size: 12px; color: var(--el-text-color-secondary);">保存后立即生效，并写入本地配置</span>
        <div>
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="onSave">保存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { useTranslationStore } from '@/stores/translation'
import { Language, getAllLanguages, getLanguageInfo, getLanguageName, type CustomLanguage } from '@/models/language'
import {
  AI_MODEL_PRESETS,
  getModelLabel,
  BATCH_PROMPT_TEMPLATE,
  SINGLE_PROMPT_TEMPLATE,
  renderPromptTemplate,
} from '@/models/ai'
import toast from '@/utils/toast'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const configStore = useConfigStore()
const translationStore = useTranslationStore()

const form = computed({
  get: () => configStore.config,
  set: (v) => configStore.updateBatch(v),
})

const activeTab = ref('general')
const allLangs = getAllLanguages()
const defLang = Language.DEF
const nonDefaultLangs = allLangs.filter(l => l !== Language.DEF)

function langLabel(lang: Language) {
  const info = getLanguageInfo(lang)
  return `${getLanguageName(lang, 'cn')} (${info.androidCode})`
}

// Language management
const enabledLangCodes = ref<Language[]>([])
const dragIndex = ref<number | null>(null)

const availableLangCodes = computed(() => {
  return nonDefaultLangs.filter(code => !enabledLangCodes.value.includes(code))
})

function addLanguage(code: Language) {
  enabledLangCodes.value = [...enabledLangCodes.value, code]
}

function removeLanguage(code: Language) {
  enabledLangCodes.value = enabledLangCodes.value.filter(c => c !== code)
}

function addAllLanguages() {
  enabledLangCodes.value = [...nonDefaultLangs]
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
  (visible) => {
    if (visible) {
      activeTab.value = 'general'
      const current = form.value.enabledLanguages || []
      enabledLangCodes.value = current.filter(l => l !== Language.DEF)
    }
  }
)

const modelPresets = computed(() => {
  return Object.entries(AI_MODEL_PRESETS).map(([model, description]) => ({
    model,
    description,
  }))
})
const isCustomModel = computed(() => form.value.aiModelPreset === 'custom')

const singlePromptPreview = computed(() => {
  const extra = form.value.aiPromptExtra?.trim()
    ? `- Additional context: ${form.value.aiPromptExtra.trim()}\n`
    : '{{可选补充提示}}\n'
  return renderPromptTemplate(SINGLE_PROMPT_TEMPLATE, {
    sourceLanguage: '{{源语言}}',
    targetLanguage: '{{目标语言}}',
    contextBlock: 'Context: This is an Android string resource named "{{资源 ID}}".\n\n',
    text: '{{原文}}',
    extraPromptBlock: extra,
  })
})

const batchPromptPreview = computed(() => {
  const extra = form.value.aiPromptExtra?.trim()
    ? `- Additional context: ${form.value.aiPromptExtra.trim()}\n`
    : '{{可选补充提示}}\n'
  return renderPromptTemplate(BATCH_PROMPT_TEMPLATE, {
    sourceLanguage: '{{源语言}}',
    targetLanguage: '{{目标语言}}',
    textsJson: JSON.stringify(
      {
        title: '{{原文 1}}',
        description: '{{原文 2}}',
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
  testStatus.value = '正在请求...'

  try {
    const ok = await translationStore.testConnection()
    testStatus.value = ok ? '连接成功' : '连接失败'
  } catch (error: any) {
    testStatus.value = '连接失败'
    toast.fromError(error, '测试失败')
  } finally {
    testLoading.value = false
  }
}

watch(
  () => [form.value.apiUrl, form.value.apiKey, form.value.httpProxy, form.value.aiModelPreset, form.value.aiCustomModel],
  () => {
    testStatus.value = ''
  }
)

async function onSave() {
  try {
    const langs: Language[] = [Language.DEF, ...enabledLangCodes.value]
    configStore.update('enabledLanguages', langs)
    await configStore.save()
    toast.success('设置已保存')
    closeDialog()
  } catch (error: any) {
    toast.fromError(error, '保存失败')
  }
}

function closeDialog() {
  emit('update:visible', false)
}

// ========== 自定义语言管理 ==========
const customLanguages = ref<CustomLanguage[]>([])

const customLangForm = ref<CustomLanguage>({
  androidCode: '',
  nameCn: '',
  nameEn: '',
  valuesDirName: '',
})

const canAddCustomLang = computed(() => {
  return customLangForm.value.androidCode.trim() &&
         customLangForm.value.nameCn.trim() &&
         customLangForm.value.nameEn.trim()
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
    valuesDirName: '',
  }
}

function addCustomLanguage() {
  if (!canAddCustomLang.value) {
    toast.warning('请填写完整信息')
    return
  }

  try {
    const langData: CustomLanguage = {
      androidCode: customLangForm.value.androidCode.trim(),
      nameCn: customLangForm.value.nameCn.trim(),
      nameEn: customLangForm.value.nameEn.trim(),
      valuesDirName: customLangForm.value.valuesDirName?.trim() || undefined,
    }

    configStore.addCustomLanguage(langData)
    customLanguages.value = configStore.getAllAvailableLanguages().filter(l => !l.isDefault)
      .map(l => ({
        androidCode: l.androidCode,
        nameCn: l.nameCn,
        nameEn: l.nameEn,
        valuesDirName: l.valuesDirName,
      }))

    toast.success('自定义语言添加成功')
    resetCustomLangForm()
  } catch (error: any) {
    toast.error(error.message || '添加自定义语言失败')
  }
}

function removeCustomLanguage(androidCode: string) {
  try {
    configStore.removeCustomLanguage(androidCode)
    customLanguages.value = customLanguages.value.filter(l => l.androidCode !== androidCode)
    toast.success('自定义语言删除成功')
  } catch (error: any) {
    toast.error(error.message || '删除自定义语言失败')
  }
}

// 加载自定义语言列表
function loadCustomLanguages() {
  customLanguages.value = configStore.getAllAvailableLanguages().filter(l => !l.isDefault)
    .map(l => ({
      androidCode: l.androidCode,
      nameCn: l.nameCn,
      nameEn: l.nameEn,
      valuesDirName: l.valuesDirName,
    }))
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      activeTab.value = 'general'
      const current = form.value.enabledLanguages || []
      enabledLangCodes.value = current.filter(l => l !== Language.DEF)
      loadCustomLanguages()
    }
  }
)
</script>
