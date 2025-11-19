# 翻译任务停止功能说明

## 🎯 功能概述

现在翻译任务支持随时停止，并且提供了更好的状态显示和用户体验。

## ✨ 新增特性

### 1. 任务停止功能
- **即时停止**：点击"停止翻译"按钮可立即中断翻译任务
- **确认提示**：停止前会弹出确认对话框，防止误操作
- **保留结果**：已完成的翻译会保留，未完成的部分会取消

### 2. 改进的状态显示
- **进度条**：实时显示翻译进度百分比
- **详细统计**：显示已完成/总数和失败数量
- **停止按钮**：翻译进行时显示醒目的红色停止按钮
- **状态切换**：翻译开始时自动隐藏批量翻译按钮

### 3. 用户体验优化
- **视觉反馈**：
  - 翻译进行时显示进度条和统计信息
  - 红色停止按钮提示用户可以中断操作
  - 确认对话框明确告知操作后果

- **操作安全**：
  - 双层确认：按钮 + 确认对话框
  - 清晰说明：告知用户已完成的翻译会保留
  - 友好提示：停止后显示"翻译已停止"提示

## 📝 实现细节

### 后端修改

**文件**: `src/services/translation/openai.ts`

1. **新增取消检查回调类型**
   ```typescript
   export type CancellationCallback = () => boolean
   ```

2. **批量翻译方法增强**
   ```typescript
   async batchTranslate(
     request: BatchTranslateRequest,
     onProgress?: ProgressCallback,
     checkCancellation?: CancellationCallback  // 新增
   ): Promise<BatchTranslateResponse> {
     for (const item of items) {
       // 检查是否取消
       if (checkCancellation && checkCancellation()) {
         throw new Error('Translation cancelled')
       }
       // ... 翻译处理
     }
   }
   ```

3. **分批翻译方法增强**
   ```typescript
   async batchTranslateChunked(
     request: BatchTranslateRequest,
     chunkSize: number = 20,
     onProgress?: ProgressCallback,
     checkCancellation?: CancellationCallback  // 新增
   ): Promise<BatchTranslateResponse> {
     for (let i = 0; i < items.length; i += chunkSize) {
       // 检查是否取消
       if (checkCancellation && checkCancellation()) {
         throw new Error('Translation cancelled')
       }
       // ... 批次处理
     }
   }
   ```

**文件**: `src/stores/translation.ts`

1. **添加取消标记**
   ```typescript
   const isCancelled = ref<boolean>(false)
   ```

2. **翻译循环检查**
   ```typescript
   async function processTranslationTasks(): Promise<void> {
     while (currentTaskIndex.value < tasks.value.length) {
       // 检查是否取消
       if (isCancelled.value) {
         logStore.info('Translation cancelled')
         state.value = TranslationState.IDLE
         return
       }
       // ... 其他检查和处理
     }
   }
   ```

3. **停止函数增强**
   ```typescript
   function stopTranslation(): void {
     isCancelled.value = true  // 设置取消标记
     state.value = TranslationState.IDLE
     currentTaskIndex.value = 0
     logStore.info('Translation stopped')
   }
   ```

4. **重置取消标记**
   - 在 `startTranslation()` 开始时重置
   - 在 `batchTranslate()` 开始时重置

5. **批量翻译取消处理**
   ```typescript
   // 传递取消检查回调
   const result = await translator.value.batchTranslateChunked(
     { items, targetLanguage, sourceLanguage },
     maxItemsPerRequest,
     (current, total) => { logStore.debug(`Progress: ${current}/${total}`) },
     () => isCancelled.value  // 取消检查回调
   )

   // 捕获取消错误
   } catch (err: any) {
     if (err.message === 'Translation cancelled') {
       logStore.info('Batch translation cancelled by user')
       // 不设置为 ERROR，保持 IDLE 状态
       return
     }
     // ... 其他错误处理
   }
   ```

### 前端修改

**文件**: `src/components/workbench/OperationsBar.vue`

1. **停止按钮**
   ```vue
   <el-button size="small" type="danger" @click="confirmStopTranslation" style="margin-left:8px;">
     停止翻译
   </el-button>
   ```

2. **确认对话框**
   ```vue
   <el-dialog v-model="stopDialogVisible" title="确认停止翻译" width="400px">
     <p>翻译正在进行中，确定要停止吗？</p>
     <p class="muted" style="margin-top:8px;">已完成的翻译将会保留。</p>
     <template #footer>
       <el-button @click="stopDialogVisible = false">取消</el-button>
       <el-button type="danger" @click="stopTranslation">确定停止</el-button>
     </template>
   </el-dialog>
   ```

3. **状态显示增强**
   ```vue
   <template v-if="isTranslating">
     <el-divider direction="vertical" />
     <el-progress :percentage="progress.percentage" :stroke-width="6" style="width: 160px" />
     <span class="muted" style="margin-left:8px;">
       {{ progress.completed }}/{{ progress.total }}，失败 {{ progress.failed }}
     </span>
     <el-button size="small" type="danger" @click="confirmStopTranslation" style="margin-left:8px;">
       停止翻译
     </el-button>
   </template>
   ```

## 🐛 修复的问题

### 问题描述
- **之前的bug**：批量翻译模式下，点击"停止翻译"后，界面状态变为停止，但后台仍在继续翻译
- **根本原因**：批量翻译模式（`batchTranslate` 和 `batchTranslateChunked`）没有检查取消标记，直接调用 OpenAITranslator 而不通过任务循环

### 解决方案
1. **添加取消检查回调**
   - 在 `OpenAITranslator` 中添加 `CancellationCallback` 类型
   - 在 `batchTranslate()` 和 `batchTranslateChunked()` 方法中接受取消检查回调
   - 在每个翻译项处理前检查取消状态

2. **传递取消状态**
   - 在 `translationStore.batchTranslate()` 中传递取消检查回调
   - 回调函数返回 `isCancelled` 的当前值

3. **错误处理**
   - 捕获 "Translation cancelled" 错误
   - 不将此错误标记为 ERROR 状态
   - 正确清理并返回 IDLE 状态

## 🔄 工作流程

### 开始翻译
1. 用户点击"批量翻译"按钮
2. 系统创建翻译任务并设置 `isCancelled = false`
3. 开始逐个处理翻译任务

### 停止翻译
1. 用户点击"停止翻译"按钮
2. 弹出确认对话框
3. 用户确认后：
   - 设置 `isCancelled = true`
   - 当前翻译任务完成后检测到取消标记
   - 停止循环，返回 IDLE 状态
   - 显示停止提示

### 状态保持
- **已完成的部分**：保留在文件中
- **未开始的部分**：取消翻译
- **正在进行的部分**：完成当前请求后停止

## 🎨 界面布局

```
[批量翻译按钮] ... [筛选统计] [|] [进度条] [已完成/总数，失败X] [停止翻译按钮]
                                              ↑ 红色按钮，醒目提示
```

## 📊 技术优势

1. **非侵入性**：取消标记不会影响正常翻译流程
2. **状态安全**：使用状态机模式确保状态一致性
3. **性能优化**：只在任务间隙检查取消标记，避免性能损耗
4. **用户友好**：双重确认 + 清晰提示 + 视觉反馈

## 🔧 使用场景

- **批量翻译**：翻译大量内容时需要中途停止
- **错误处理**：发现翻译错误需要重新配置时
- **资源节省**：网络不稳定或API额度不足时
- **紧急中断**：其他紧急任务需要处理时

## ✅ 兼容性

- ✅ 支持任务模式翻译（逐个翻译）
- ✅ 支持批量翻译模式
- ✅ 支持字符串和字符串数组翻译
- ✅ 向后兼容现有功能
- ✅ 不影响已完成的翻译结果

## 🚀 未来扩展

- 添加暂停/恢复功能
- 支持优先级翻译（先翻译重要的）
- 添加翻译速度控制
- 支持批量停止多个翻译任务
