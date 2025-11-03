<template>
  <el-dialog :model-value="visible" title="设置" width="640px" @close="emit('update:visible', false)">
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
      <el-form-item label="启用语言">
        <el-select v-model="form.enabledLanguages" multiple filterable collapse-tags style="width:100%">
          <el-option v-for="l in allLangs" :key="l" :label="langName(l)" :value="l" />
        </el-select>
      </el-form-item>
      <el-form-item label="主题">
        <el-radio-group v-model="form.theme">
          <el-radio-button label="light">浅色</el-radio-button>
          <el-radio-button label="dark">深色</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示日志面板">
        <el-switch v-model="form.showLogView" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onTest">测试连接</el-button>
        <div class="toolbar-spacer" />
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useTranslationStore } from '@/stores/translation'
import { Language, getAllLanguages, getLanguageName } from '@/models/language'
import { ElMessage } from 'element-plus'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const configStore = useConfigStore()
const translationStore = useTranslationStore()

const form = computed({
  get: () => configStore.config,
  set: (v) => configStore.updateBatch(v),
})

const allLangs = getAllLanguages()
function langName(l: Language) { return getLanguageName(l, 'cn') }

async function onTest() {
  try {
    const ok = await translationStore.testConnection()
    ElMessage[ok ? 'success' : 'error'](ok ? '连接成功' : '连接失败')
  } catch (e: any) {
    ElMessage.error(e?.message || '测试失败')
  }
}

async function onSave() {
  try {
    await configStore.save()
    ElMessage.success('设置已保存')
    emit('update:visible', false)
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}
</script>

<style scoped>
.dialog-footer { display: flex; align-items: center; width: 100%; }
</style>
