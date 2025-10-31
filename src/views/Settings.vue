<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-cog</v-icon>
            设置
          </v-card-title>

          <v-card-text>
            <v-tabs v-model="tab">
              <v-tab value="api">API 设置</v-tab>
              <v-tab value="languages">翻译语言</v-tab>
              <v-tab value="advanced">高级设置</v-tab>
            </v-tabs>

            <v-window v-model="tab" class="mt-4">
              <!-- API 设置 -->
              <v-window-item value="api">
                <v-form>
                  <v-text-field
                    v-model="configStore.config.apiUrl"
                    label="API URL"
                    hint="OpenAI API 端点地址"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>

                  <v-text-field
                    v-model="configStore.config.apiToken"
                    label="API Token"
                    type="password"
                    hint="OpenAI API 密钥"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>

                  <v-text-field
                    v-model="configStore.config.httpProxy"
                    label="HTTP 代理（可选）"
                    hint="格式: host:port"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>

                  <v-btn
                    color="primary"
                    :disabled="!configStore.config.apiToken"
                    @click="testConnection"
                  >
                    测试连接
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- 翻译语言 -->
              <v-window-item value="languages">
                <div class="text-subtitle-2 mb-2">选择要启用的翻译语言：</div>
                <v-chip-group column>
                  <v-chip
                    v-for="lang in allLanguages"
                    :key="lang"
                    :model-value="isLanguageEnabled(lang)"
                    :disabled="lang === Language.DEF"
                    filter
                    @click="toggleLanguage(lang)"
                  >
                    {{ getLanguageName(lang, 'cn') }}
                  </v-chip>
                </v-chip-group>
              </v-window-item>

              <!-- 高级设置 -->
              <v-window-item value="advanced">
                <v-form>
                  <v-text-field
                    v-model.number="configStore.config.maxItemsPerRequest"
                    label="每批最大条目数"
                    type="number"
                    hint="每次翻译请求的最大条目数 (1-100)"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>

                  <v-text-field
                    v-model.number="configStore.config.requestTimeout"
                    label="请求超时 (毫秒)"
                    type="number"
                    hint="API 请求超时时间 (1000-300000)"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>

                  <v-switch
                    v-model="configStore.config.autoRetry"
                    label="自动重试失败的请求"
                    color="primary"
                    class="mb-4"
                  ></v-switch>

                  <v-text-field
                    v-if="configStore.config.autoRetry"
                    v-model.number="configStore.config.maxRetries"
                    label="最大重试次数"
                    type="number"
                    hint="失败后最多重试的次数 (1-10)"
                    persistent-hint
                    class="mb-4"
                  ></v-text-field>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn to="/">返回</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { Language, getAllLanguages, getLanguageName } from '@/models/language'

const configStore = useConfigStore()
const tab = ref('api')
const allLanguages = getAllLanguages()

function isLanguageEnabled(lang: Language): boolean {
  return configStore.config.enabledLanguages.includes(lang)
}

function toggleLanguage(lang: Language): void {
  if (lang === Language.DEF) return

  const languages = configStore.config.enabledLanguages
  const index = languages.indexOf(lang)
  if (index > -1) {
    languages.splice(index, 1)
  } else {
    languages.push(lang)
  }
}

function testConnection(): void {
  // TODO: 实现 API 连接测试
  console.log('Testing API connection...')
}
</script>
