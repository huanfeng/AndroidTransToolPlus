export interface AiModelPreset {
  model: string
  description: string
}

export const AI_MODEL_PRESETS: Record<string, string> = {
  'gpt-5-mini': '默认推荐, 兼顾速度与质量',
  'gpt-5': '标准模型, 效果更好',
  'gpt-5-nano': 'nano模型, 价格便宜',
  'gpt-4.1-mini': '',
  'gpt-4o-mini': '',
  custom: '手动指定任意模型名称（需支持 JSON 模式）',
}

export const DEFAULT_AI_MODEL_PRESET = 'gpt-5-mini'

export function resolveAiModel(presetId: string, customModel: string): string {
  if (presetId && presetId !== 'custom' && AI_MODEL_PRESETS[presetId]) {
    return presetId
  }
  const trimmed = customModel?.trim()
  if (trimmed) {
    return trimmed
  }
  return DEFAULT_AI_MODEL_PRESET
}

export function getModelLabel(model: string): string {
  const description = AI_MODEL_PRESETS[model]
  if (description) {
    return `${model} (${description})`
  }
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

export function renderPromptTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => replacements[key] ?? '')
}
