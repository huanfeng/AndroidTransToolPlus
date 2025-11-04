<template>
  <el-dialog :model-value="visible" title="设置" width="760px" @close="emit('update:visible', false)">
    <el-tabs>
      <el-tab-pane label="基础">
        <el-form label-width="140px" :model="form" style="padding-right:12px">
          <el-form-item label="API URL">
            <el-input v-model="form.apiUrl" />
          </el-form-item>
          <el-form-item label="API Token">
            <el-input v-model="form.apiToken" type="password" show-password />
          </el-form-item>
          <el-form-item label="HTTP 代理">
            <el-input v-model="form.httpProxy" placeholder="http://127.0.0.1:7890" />
          </el-form-item>
          <el-form-item label="每批最大条目">
            <el-input-number v-model="form.maxItemsPerRequest" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="最大重试次数">
            <el-input-number v-model="form.maxRetries" :min="0" :max="10" />
          </el-form-item>
          <el-form-item label="请求超时(ms)">
            <el-input-number v-model="form.requestTimeout" :min="1000" :max="300000" :step="1000" />
          </el-form-item>
          <el-form-item label="自动重试已有译文">
            <el-switch v-model="form.autoRetry" />
          </el-form-item>
          <el-form-item label="主题">
            <el-radio-group v-model="form.theme">
              <el-radio-button label="light">浅色</el-radio-button>
              <el-radio-button label="dark">深色</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <div style="padding: 8px 0;">
            <el-button @click="onTest">测试连接</el-button>
          </div>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="语言">
        <div class="lang-tab">
          <div class="lang-enable">
            <div class="section-title">启用语言</div>
            <el-checkbox-group v-model="enabledNonDefault" class="lang-grid">
              <el-checkbox v-for="l in nonDefaultLangs" :key="l" :label="l">{{ langLabel(l) }}</el-checkbox>
            </el-checkbox-group>
          </div>
          <el-divider />
          <div class="lang-order">
            <div class="section-title">排序（拖拽或按钮）</div>
            <ul class="order-list">
              <li class="def">{{ langLabel(defLang) }}（固定第一）</li>
              <li v-for="(l, idx) in orderedNonDefault" :key="l">
                <span>{{ langLabel(l) }}</span>
                <span class="ops">
                  <el-button link size="small" :disabled="idx===0" @click="moveUp(idx)">上移</el-button>
                  <el-button link size="small" :disabled="idx===orderedNonDefault.length-1" @click="moveDown(idx)">下移</el-button>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div class="dialog-footer">
        <div class="toolbar-spacer" />
        <el-button @click="emit('update:visible', false)">关闭</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useTranslationStore } from '@/stores/translation'
import { Language, getAllLanguages, getLanguageName, getLanguageInfo } from '@/models/language'
import toast from '@/utils/toast'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const configStore = useConfigStore()
const translationStore = useTranslationStore()

const form = computed({
  get: () => configStore.config,
  set: (v) => configStore.updateBatch(v),
})

const allLangs = getAllLanguages()
const defLang = Language.DEF
const nonDefaultLangs = allLangs.filter(l => l !== Language.DEF)
function langLabel(l: Language) { const info = getLanguageInfo(l); return `${getLanguageName(l, 'cn')} (${info.androidCode})` }

// 启用语言（不包含默认）
const enabledNonDefault = ref<Language[]>([])
watch(() => props.visible, (v) => {
  if (v) {
    const current = form.value.enabledLanguages.filter(l => l !== Language.DEF)
    enabledNonDefault.value = current.slice()
    orderedNonDefault.value = current.slice()
  }
})

watch(enabledNonDefault, (v) => {
  // 依据勾选过滤排序列表
  orderedNonDefault.value = orderedNonDefault.value.filter(l => v.includes(l))
  for (const l of v) {
    if (!orderedNonDefault.value.includes(l)) orderedNonDefault.value.push(l)
  }
})

// 排序（不包含默认）
const orderedNonDefault = ref<Language[]>([])
function moveUp(idx: number) {
  if (idx <= 0) return
  const arr = orderedNonDefault.value.slice()
  ;[arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]
  orderedNonDefault.value = arr
}
function moveDown(idx: number) {
  if (idx >= orderedNonDefault.value.length - 1) return
  const arr = orderedNonDefault.value.slice()
  ;[arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]]
  orderedNonDefault.value = arr
}

async function onTest() {
  try {
    const ok = await translationStore.testConnection()
    ok ? toast.success('连接成功') : toast.error('连接失败')
  } catch (e: any) {
    toast.fromError(e, '测试失败')
  }
}

async function onSave() {
  try {
    // 组合最终语言顺序：默认语言在首位
    const langs: Language[] = [Language.DEF, ...orderedNonDefault.value]
    configStore.update('enabledLanguages', langs)
    await configStore.save()
    toast.success('设置已保存')
    emit('update:visible', false)
  } catch (e: any) {
    toast.fromError(e, '保存失败')
  }
}
</script>

<style scoped>
.dialog-footer { display: flex; align-items: center; width: 100%; }
.lang-tab { padding: 8px 4px; }
.lang-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; }
.section-title { font-weight: 600; color: var(--ep-text-color-regular); margin-bottom: 6px; }
.order-list { list-style: none; padding: 0; margin: 0; }
.order-list li { display:flex; justify-content: space-between; align-items:center; padding: 6px 8px; border:1px solid var(--el-border-color); border-radius: 4px; margin-bottom: 6px; }
.order-list li.def { background: var(--el-fill-color-light); }
</style>
