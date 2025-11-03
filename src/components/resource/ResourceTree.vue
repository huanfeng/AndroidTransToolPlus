<template>
  <div class="resource-tree">
    <el-empty description="未打开项目" v-if="!projectStore.hasProject" />

    <template v-else>
      <el-scrollbar height="100%">
        <el-tree
          :data="treeData"
          node-key="id"
          :props="{ children: 'children', label: 'label' }"
          :default-expand-all="true"
          :highlight-current="true"
          :current-node-key="currentNodeKey"
          @node-click="onNodeClick"
        >
          <template #default="{ data }">
            <span>{{ data.label }}</span>
          </template>
        </el-tree>
      </el-scrollbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElLoading } from 'element-plus'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

interface TreeNode {
  id: string
  label: string
  type: 'res' | 'file'
  fileName?: string
  children?: TreeNode[]
}

const treeData = computed<TreeNode[]>(() => {
  if (!projectStore.project) return []
  return projectStore.project.resDirs.map((dir) => ({
    id: dir.relativePath,
    label: dir.relativePath,
    type: 'res',
    children: dir.xmlFileNames.map((f) => ({
      id: `${dir.relativePath}/${f}`,
      label: fileLabel(dir.relativePath, f),
      type: 'file',
      fileName: f,
    })),
  }))
})

const currentNodeKey = computed(() => {
  if (!projectStore.selectedResDir || !projectStore.selectedXmlFile) return projectStore.selectedResDir || ''
  return `${projectStore.selectedResDir}/${projectStore.selectedXmlFile}`
})

function fileLabel(resPath: string, fileName: string): string {
  const xml = projectStore.project?.xmlDataMap.get(resPath)
  if (!xml) return fileName
  const dataMap = xml.getFileData(fileName)
  const count = dataMap ? dataMap.size : 0
  return count > 0 ? `${fileName} (${count})` : fileName
}

function onNodeClick(node: TreeNode) {
  if (node.type === 'res') {
    projectStore.selectResDir(node.id)
    const loading = ElLoading.service({ lock: true, text: '加载目录中...' })
    projectStore.loadResDir(node.id).catch(() => {}).finally(() => loading.close())
  } else if (node.type === 'file') {
    const [resPath, fileName] = [node.id.substring(0, node.id.lastIndexOf('/')), node.fileName!]
    projectStore.selectResDir(resPath)
    projectStore.selectXmlFile(fileName)
  }
}
</script>

<style scoped>
.resource-tree { height: 100%; }
</style>
