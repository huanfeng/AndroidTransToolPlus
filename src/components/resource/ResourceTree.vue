<template>
  <div class="resource-tree">
    <el-empty description="未打开项目" v-if="!projectStore.hasProject" />

    <template v-else>
      <div class="tree-toolbar compact">
        <el-tooltip content="展开所有" placement="top">
          <el-button size="small" plain class="icon-btn" @click="expandAll">
            <el-icon><Expand /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" class="tight-divider" />
        <el-tooltip content="折叠所有" placement="top">
          <el-button size="small" plain class="icon-btn" @click="collapseAll">
            <el-icon><Fold /></el-icon>
          </el-button>
        </el-tooltip>
        <div class="toolbar-spacer"></div>
        <el-input
          v-model="filterText"
          size="small"
          clearable
          placeholder="过滤"
          style="max-width: 180px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <el-scrollbar height="100%">
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :props="{ children: 'children', label: 'label' }"
          :default-expand-all="true"
          :highlight-current="true"
          :current-node-key="currentNodeKey"
          :filter-node-method="filterNode"
          @node-click="onNodeClick"
        >
          <template #default="{ data }">
            <span class="node-label">
              <span>{{ data.label }}</span>
              <el-icon v-if="data.type === 'file' && loadingFileId === data.id" class="loading-icon"
                ><Loading
              /></el-icon>
            </span>
          </template>
        </el-tree>
      </el-scrollbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import { Search, Loading, Expand, Fold } from '@element-plus/icons-vue'

const projectStore = useProjectStore()

interface TreeNode {
  id: string
  label: string
  type: 'res' | 'file'
  fileName?: string
  children?: TreeNode[]
}

const treeRef = ref<any>()
const filterText = ref('')
const loadingFileId = ref<string | null>(null)

const treeData = computed<TreeNode[]>(() => {
  if (!projectStore.project) return []
  return projectStore.project.resDirs.map(dir => ({
    id: dir.relativePath,
    label: dir.relativePath,
    type: 'res',
    children: dir.xmlFileNames.map(f => ({
      id: `${dir.relativePath}/${f}`,
      label: fileLabel(dir.relativePath, f),
      type: 'file',
      fileName: f,
    })),
  }))
})

const currentNodeKey = computed(() => {
  if (!projectStore.selectedResDir || !projectStore.selectedXmlFile)
    return projectStore.selectedResDir || ''
  return `${projectStore.selectedResDir}/${projectStore.selectedXmlFile}`
})

watch(filterText, v => {
  treeRef.value?.filter(v)
})

function filterNode(value: string, data: TreeNode): boolean {
  const q = (value || '').toLowerCase()
  if (!q) return true
  return data.label.toLowerCase().includes(q)
}

function fileLabel(resPath: string, fileName: string): string {
  const xml = projectStore.project?.xmlDataMap.get(resPath)
  if (!xml) return fileName
  const dataMap = xml.getFileData(fileName)
  // 只统计真实存在的文件（有 fileHandle）
  let count = 0
  if (dataMap) {
    for (const [, data] of dataMap) {
      if (data.fileHandle) count++
    }
  }
  return count > 0 ? `${fileName} (${count})` : fileName
}

function onNodeClick(node: TreeNode) {
  try {
    if (node.type === 'res') {
      // 仅选择目录，不再触发目录级加载
      projectStore.selectResDir(node.id)
    } else if (node.type === 'file') {
      const [resPath, fileName] = [node.id.substring(0, node.id.lastIndexOf('/')), node.fileName!]
      projectStore.selectResDir(resPath)
      projectStore.selectXmlFile(fileName)
      loadingFileId.value = node.id
      
      // 调用 loadSelectedFile 方法
      if ('loadSelectedFile' in projectStore && typeof projectStore.loadSelectedFile === 'function') {
        projectStore.loadSelectedFile()
          .catch(() => {})
          .finally(() => {
            loadingFileId.value = null
          })
      } else {
        loadingFileId.value = null
      }
    }
  } catch {
    // swallow to avoid unhandled error in ElTree native handler
    loadingFileId.value = null
  }
}

function expandAll() {
  const ids = collectIds(treeData.value)
  ids.forEach(id => {
    const node = treeRef.value?.getNode(id)
    if (node) node.expanded = true
  })
}

function collapseAll() {
  const ids = collectIds(treeData.value)
  ids.forEach(id => {
    const node = treeRef.value?.getNode(id)
    if (node) node.expanded = false
  })
}

function collectIds(nodes: TreeNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === 'res') acc.push(n.id)
    if (n.children && n.children.length) collectIds(n.children, acc)
  }
  return acc
}
</script>

<style scoped>
.resource-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
}
.toolbar-spacer {
  flex: 1;
}
.node-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.loading-icon {
  color: var(--el-text-color-secondary);
  animation: spin 1s linear infinite;
  font-size: 14px;
}
.tree-toolbar.compact {
  padding: 4px 6px;
  gap: 6px;
}
.tree-toolbar .icon-btn {
  padding: 2px 6px;
  min-width: 28px;
  height: 26px;
}
.tree-toolbar .tight-divider {
  margin: 0 4px;
}
.node-label {
  gap: 4px;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
