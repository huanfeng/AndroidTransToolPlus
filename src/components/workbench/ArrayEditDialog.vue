<template>
  <el-dialog :model-value="visible" title="编辑字符串数组" width="560px" @close="emit('update:visible', false)">
    <div class="desc">
      <p>每行代表一个数组项，保存时会覆盖该语言下的整个数组。</p>
    </div>
    <el-input
      v-model="text"
      type="textarea"
      :autosize="{ minRows: 10 }"
      placeholder="一行一个数组元素"
    />
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { Language } from '@/models/language'

const props = defineProps<{ visible: boolean; itemName: string; lang: Language }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const projectStore = useProjectStore()
const text = ref('')

const arrValue = computed<string[]>(() => {
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return []
  const fileMap = projectStore.selectedXmlData.getFileData(projectStore.selectedXmlFile)
  const data = props.lang === Language.DEF ? fileMap?.get(Language.DEF) : fileMap?.get(props.lang)
  const item = data?.items.get(props.itemName)
  const v = item?.valueMap.get(props.lang)
  return Array.isArray(v) ? v : []
})

watch(() => props.visible, (v) => {
  if (v) text.value = arrValue.value.join('\n')
})

function onSave() {
  const lines = text.value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)
  if (!projectStore.selectedXmlData || !projectStore.selectedXmlFile) return
  projectStore.selectedXmlData.updateItem(projectStore.selectedXmlFile, props.itemName, props.lang, lines)
  emit('update:visible', false)
}
</script>

<style scoped>
.desc { color: var(--ep-text-color-secondary); margin-bottom: 8px; }
</style>

