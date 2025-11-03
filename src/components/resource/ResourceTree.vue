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
      label: f,
      type: 'file',
      fileName: f,
    })),
  }))
})

function onNodeClick(node: TreeNode) {
  if (node.type === 'res') {
    projectStore.selectResDir(node.id)
    projectStore.loadResDir(node.id).catch(() => {})
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

