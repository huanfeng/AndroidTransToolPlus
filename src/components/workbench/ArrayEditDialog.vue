<template>
  <el-dialog
    :model-value="visible"
    :title="$t('arrayEdit.title')"
    width="560px"
    @close="emit('update:visible', false)"
  >
    <div class="desc">
      <p>{{ $t('arrayEdit.description') }}</p>
    </div>
    <el-input
      v-model="text"
      type="textarea"
      :autosize="{ minRows: 10 }"
      :placeholder="$t('arrayEdit.placeholder')"
    />
    <template #footer>
      <el-button @click="emit('update:visible', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="onSave">{{ $t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { LANGUAGE, type Language } from '@/models/language'

const props = defineProps<{ visible: boolean; itemName: string; lang: Language }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const projectStore = useProjectStore()
const text = ref('')

const arrValue = computed<string[]>(() => {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return []
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const data = props.lang === LANGUAGE.DEF ? fileMap?.get(LANGUAGE.DEF) : fileMap?.get(props.lang)
  const item = data?.items.get(props.itemName)
  const v = item?.valueMap.get(props.lang)
  return Array.isArray(v) ? v : []
})

watch(
  () => props.visible,
  v => {
    if (v) text.value = arrValue.value.join('\n')
  }
)

function onSave() {
  const lines = text.value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  projectStore.selectedXmlData.updateItem(
    projectStore.selectedXmlFile,
    props.itemName,
    props.lang,
    lines
  )
  emit('update:visible', false)
}
</script>

<style scoped>
.desc {
  color: var(--ep-text-color-secondary);
  margin-bottom: 8px;
}
</style>
