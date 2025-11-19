export interface AiModelPreset {
  id: string
  label: string
  description: string
  model: string
}

export const AI_MODEL_PRESETS: AiModelPreset[] = [
  {
    id: 'gpt-4o-mini',
    label: 'gpt-4o-mini',
    description: '默认推荐，兼顾速度与质量',
    model: 'gpt-4o-mini',
  },
  {
    id: 'gpt-4o',
    label: 'gpt-4o',
    description: '高质量输出，速度略慢',
    model: 'gpt-4o',
  },
  {
    id: 'o1-mini',
    label: 'o1-mini',
    description: '思考模式，适合需要更多推理的场景',
    model: 'o1-mini',
  },
  {
    id: 'custom',
    label: '自定义模型',
    description: '手动指定任意模型名称（需支持 JSON 模式）',
    model: '',
  },
]

export const DEFAULT_AI_MODEL_PRESET = 'gpt-4o-mini'

export function resolveAiModel(presetId: string, customModel: string): string {
  const preset = AI_MODEL_PRESETS.find(item => item.id === presetId && item.id !== 'custom')
  if (preset) {
    return preset.model
  }
  const trimmed = customModel?.trim()
  if (trimmed) {
    return trimmed
  }
  return AI_MODEL_PRESETS[0].model
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
- Return results in JSON format: {"key": "translation"}
{{extraPromptBlock}}Texts to translate:
{{textsJson}}

Translations (JSON only):`

export function renderPromptTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => replacements[key] ?? '')
}
