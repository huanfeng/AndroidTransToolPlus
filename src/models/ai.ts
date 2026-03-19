export interface AiModelPreset {
  model: string
  description: string
}

/**
 * 模型预设列表
 * value 为翻译 key（在 settings.ai.modelDesc 下），空字符串表示无描述
 */
export const AI_MODEL_PRESETS: Record<string, string> = {
  'gpt-5-mini': 'gpt5Mini',
  'gpt-5': 'gpt5',
  'gpt-5-nano': 'gpt5Nano',
  'gpt-4.1-mini': '',
  'gpt-4o-mini': '',
  custom: 'custom',
}

export const DEFAULT_AI_MODEL_PRESET = 'gpt-5-mini'

export function resolveAiModel(presetId: string, customModel: string): string {
  if (presetId && presetId !== 'custom' && presetId in AI_MODEL_PRESETS) {
    return presetId
  }
  const trimmed = customModel?.trim()
  if (trimmed) {
    return trimmed
  }
  return DEFAULT_AI_MODEL_PRESET
}

/**
 * 获取模型标签（不含描述）
 */
export function getModelLabel(model: string): string {
  return model
}

export const SINGLE_PROMPT_TEMPLATE = `Translate the following text from {{sourceLanguage}} to {{targetLanguage}}.

{{contextBlock}}Original text:
{{text}}

Requirements:
- Maintain the original meaning and tone
- Keep any placeholders like %s, %d, %1$s unchanged
- Preserve special characters and formatting
- Return ONLY the translated text, no explanations
{{extraPromptBlock}}Translation:`

export const BATCH_PROMPT_TEMPLATE = `Translate the following texts from {{sourceLanguage}} to {{targetLanguage}}.

Requirements:
- Maintain the original meaning and tone
- Keep any placeholders like %s, %d, %1$s unchanged
- Preserve special characters and formatting
- Return results in JSON format: {"key": "translated_text"} (same keys as input)
- Keep arrays and nested structures exactly as provided
- For array values, maintain the array structure with same length
- For values with context, use the context to better understand the meaning
{{extraPromptBlock}}Texts to translate (each value contains "text" to translate and optional "context"):
{{textsJson}}

For each item:
1. Translate the "text" value while preserving formatting
2. If the value is an array, translate each element and return an array of same length
3. Keep all placeholders and formatting intact
4. Return only the translated text/array, no context needed in output

Return ONLY valid JSON without any explanations: {"key": "translated_text_or_array"}`

/**
 * 双源翻译 - 单条提示模板
 * 同时提供主源语言和第二源语言作为参考
 */
export const DUAL_SOURCE_SINGLE_PROMPT_TEMPLATE = `Translate the following text to {{targetLanguage}}.

You are provided with TWO reference texts in different languages. Use both references to produce a more accurate translation.

{{contextBlock}}Primary reference ({{primarySourceLanguage}}):
{{primaryText}}

Secondary reference ({{secondarySourceLanguage}}):
{{secondaryText}}

Requirements:
- Use both references to understand the meaning accurately
- When the primary and secondary references differ in nuance, prefer the primary reference
- Maintain the original meaning and tone
- Keep any placeholders like %s, %d, %1$s unchanged
- Preserve special characters and formatting
- Return ONLY the translated text, no explanations
{{extraPromptBlock}}Translation:`

/**
 * 双源翻译 - 批量提示模板
 */
export const DUAL_SOURCE_BATCH_PROMPT_TEMPLATE = `Translate the following texts to {{targetLanguage}}.

You are provided with TWO reference texts in different languages for each item. Use both references to produce more accurate translations.

Requirements:
- Use both references to understand the meaning accurately
- When the primary and secondary references differ in nuance, prefer the primary reference
- Maintain the original meaning and tone
- Keep any placeholders like %s, %d, %1$s unchanged
- Preserve special characters and formatting
- Return results in JSON format: {"key": "translated_text"} (same keys as input)
- Keep arrays and nested structures exactly as provided
- For array values, maintain the array structure with same length
{{extraPromptBlock}}Texts to translate (each item has "primary" in {{primarySourceLanguage}} and "secondary" in {{secondarySourceLanguage}}):
{{textsJson}}

For each item:
1. Use both "primary" and "secondary" references to produce the best translation
2. If the value is an array, translate each element and return an array of same length
3. Keep all placeholders and formatting intact
4. Return only the translated text/array

Return ONLY valid JSON without any explanations: {"key": "translated_text_or_array"}`

export function renderPromptTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => replacements[key] ?? '')
}
