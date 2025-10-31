<template>
  <v-container fluid class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card>
          <v-card-title class="text-h4 text-center py-6">
            Android Trans Tool Plus
          </v-card-title>

          <v-card-text>
            <v-alert
              v-if="!platformCapabilities.canAccessFileSystem"
              type="warning"
              variant="tonal"
              class="mb-4"
            >
              <v-alert-title>不支持文件系统访问</v-alert-title>
              <div>
                您的浏览器不支持 File System Access API。
                请使用 Chrome、Edge 或 Tauri 桌面版本。
              </div>
            </v-alert>

            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-information-outline</v-icon>
                </template>
                <v-list-item-title>平台信息</v-list-item-title>
                <v-list-item-subtitle>
                  {{ platformCapabilities.isTauri ? 'Tauri 桌面版' : '浏览器版' }}
                  ({{ platformCapabilities.browserName }})
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-folder-open-outline</v-icon>
                </template>
                <v-list-item-title>文件系统访问</v-list-item-title>
                <v-list-item-subtitle>
                  {{ platformCapabilities.canAccessFileSystem ? '✓ 支持' : '✗ 不支持' }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-4"></v-divider>

            <div class="text-center">
              <v-btn
                size="large"
                color="primary"
                prepend-icon="mdi-folder-open"
                :disabled="!platformCapabilities.canAccessFileSystem"
                @click="openProject"
              >
                打开 Android 项目
              </v-btn>
            </div>

            <div class="text-center mt-4">
              <v-btn
                variant="text"
                prepend-icon="mdi-cog"
                to="/settings"
              >
                设置
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPlatformCapabilities, getFileSystemAdapter } from '@/adapters'

const platformCapabilities = ref(getPlatformCapabilities())

async function openProject() {
  try {
    const fs = getFileSystemAdapter()
    const dirHandle = await fs.selectDirectory()
    if (dirHandle) {
      console.log('Selected directory:', dirHandle.name)
      // TODO: 加载项目
    }
  } catch (error) {
    console.error('Failed to open project:', error)
  }
}

onMounted(() => {
  console.log('[Home] Component mounted')
  console.log('[Platform]', platformCapabilities.value)
})
</script>
