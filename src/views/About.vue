<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon class="mr-2">mdi-information</v-icon>
            关于
          </v-card-title>

          <v-card-text>
            <div class="text-h6 mb-2">Android Trans Tool Plus</div>
            <div class="text-subtitle-1 mb-4">Version 1.0.0</div>

            <v-divider class="my-4"></v-divider>

            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">简介</div>
              <p>
                Android Trans Tool Plus 是一个基于 Web 技术的 Android 应用国际化翻译工具，
                通过 OpenAI GPT 模型自动化翻译 Android 字符串资源文件。
              </p>
            </div>

            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">技术栈</div>
              <v-chip-group column>
                <v-chip>Vue 3</v-chip>
                <v-chip>TypeScript</v-chip>
                <v-chip>Vuetify 3</v-chip>
                <v-chip>Vite</v-chip>
                <v-chip v-if="isTauri">Tauri 2</v-chip>
              </v-chip-group>
            </div>

            <div class="mb-4">
              <div class="text-subtitle-2 mb-2">支持的语言</div>
              <div class="text-body-2">
                支持 13 种语言的翻译，包括简体中文、繁体中文、日语、韩语、
                阿拉伯语、德语、法语、印地语、意大利语、希伯来语、俄语、乌克兰语等。
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="text-caption text-grey">
              © 2025 Android Trans Tool Plus. All rights reserved.
            </div>
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
import { isTauri } from '@/adapters'
</script>
