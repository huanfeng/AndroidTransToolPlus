/**
 * OpenAI 兼容端点的探测与诊断
 *
 * 这一层只关心「协议」，不关心翻译业务：
 * - 规范化用户填写的 API URL（补协议、补 /v1、去掉误填的 /chat/completions）
 * - 拉取模型列表（GET {base}/models）
 * - 把各种失败原因分类成可读的诊断结果，而不是笼统的「连接失败」
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'

/** 端点探测/调用失败的原因分类 */
export type ApiErrorKind =
  | 'cancelled' // 用户主动取消
  | 'timeout' // 请求超时
  | 'network' // 网络不可达，或被 CORS 拦截——浏览器不让 JS 区分两者，
  //            靠 probeReachableWithoutCors 二次探测才能判定
  | 'auth' // 401 / 403，API Key 无效或无权限
  | 'notFound' // 404，路径不存在（URL 填错，或该服务不提供此端点）
  | 'modelNotFound' // 模型名不存在 / 无权访问
  | 'rateLimit' // 429，限流或额度耗尽
  | 'server' // 5xx，服务端错误
  | 'badResponse' // 能连通，但响应结构不符合 OpenAI 规范
  | 'unknown'

/** 归类后的错误 */
export interface ClassifiedApiError {
  kind: ApiErrorKind
  /** 服务端返回的原始错误信息（若有），用于展示细节 */
  detail?: string
  /** HTTP 状态码（若有） */
  status?: number
}

/** 单个诊断步骤的标识 */
export type DiagnosticStepId = 'config' | 'endpoint' | 'auth' | 'model' | 'chat'

export type DiagnosticStatus = 'success' | 'warning' | 'error' | 'skipped'

/** 单个诊断步骤的结果 */
export interface DiagnosticStep {
  id: DiagnosticStepId
  status: DiagnosticStatus
  /** i18n key（位于 settings.ai.diagnose.msg 下），由 UI 层翻译 */
  messageKey: string
  /** 传给 i18n 的插值参数 */
  messageParams?: Record<string, string | number>
  /** 原始细节（服务端错误信息等），直接展示不翻译 */
  detail?: string
}

/** 整体诊断结果 */
export interface DiagnosticReport {
  ok: boolean
  steps: DiagnosticStep[]
  /** 探测出的可用 base URL，可能与用户填写的不同 */
  resolvedApiUrl?: string
  /** 探测过程中顺带拉到的模型列表 */
  models?: string[]
}

/** 常见的 API 版本路径段，用于判断 URL 是否已经指向版本根 */
const VERSION_SEGMENTS = ['v1', 'v1beta', 'v2', 'v3', 'v4', 'openai', 'compatible-mode']

/** 用户可能误填的完整端点路径后缀，需要剥掉才能得到 base URL */
const ENDPOINT_SUFFIXES = [
  '/chat/completions',
  '/completions',
  '/responses',
  '/embeddings',
  '/models',
]

/**
 * 规范化用户填写的 API URL，得到 base URL（不含末尾斜杠）
 *
 * 处理：缺少协议头、末尾斜杠、误填完整端点路径。
 * 不负责补 /v1——那交给 {@link buildBaseUrlCandidates} 作为探测候选，
 * 因为有的服务确实不带版本段。
 */
export function normalizeApiBaseUrl(raw: string): string {
  let url = (raw || '').trim()
  if (!url) return ''

  // 以 / 开头的是同源相对路径（走 dev server / 反向代理绕开 CORS），原样保留
  const isRelative = url.startsWith('/')

  // 补协议头：裸域名或 IP:端口一律按 https 处理，localhost 按 http
  if (!isRelative && !/^https?:\/\//i.test(url)) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(url)
    url = `${isLocal ? 'http' : 'https'}://${url}`
  }

  // 去掉 query 和 hash，它们不该出现在 base URL 里
  url = url.split('#')[0].split('?')[0]

  // 去掉末尾斜杠
  url = url.replace(/\/+$/, '')

  // 剥掉误填的完整端点路径
  for (const suffix of ENDPOINT_SUFFIXES) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length)
      break
    }
  }

  return url.replace(/\/+$/, '')
}

/** URL 的最后一段是否是版本段 */
function endsWithVersionSegment(url: string): boolean {
  const lastSegment = url.split('/').pop()?.toLowerCase() ?? ''
  return VERSION_SEGMENTS.includes(lastSegment)
}

/**
 * 生成 base URL 候选列表，按尝试优先级排序
 *
 * 例如 `https://api.openai.com` 会产出 `[.../v1, ...]`，
 * 这样用户只填域名也能连上。
 */
export function buildBaseUrlCandidates(raw: string): string[] {
  const base = normalizeApiBaseUrl(raw)
  if (!base) return []

  const candidates: string[] = []
  const push = (url: string) => {
    if (url && !candidates.includes(url)) candidates.push(url)
  }

  // 相对路径由使用者在代理规则里写死，不替它猜版本段
  if (base.startsWith('/')) {
    push(base)
    return candidates
  }

  if (endsWithVersionSegment(base)) {
    // 已经指向版本根，直接用；留个不带版本的兜底
    push(base)
    push(base.replace(/\/[^/]+$/, ''))
  } else {
    // 绝大多数 OpenAI 兼容服务都在 /v1 下，优先试它
    push(`${base}/v1`)
    push(base)
  }

  return candidates
}

/**
 * 把 axios 抛出的异常归类成可读的失败原因
 *
 * 浏览器出于安全限制，CORS 失败和网络不可达在 JS 里是同一种「没有 response」
 * 的错误，无法区分，所以统一归为 network，由文案同时提示两种可能。
 */
export function classifyApiError(error: any): ClassifiedApiError {
  if (
    axios.isCancel(error) ||
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  ) {
    return { kind: 'cancelled' }
  }

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return { kind: 'timeout', detail: error?.message }
  }

  const status: number | undefined = error?.response?.status
  const detail = extractErrorMessage(error)

  if (status === undefined) {
    return { kind: 'network', detail: detail || error?.message }
  }

  if (status === 401 || status === 403) {
    return { kind: 'auth', status, detail }
  }
  if (status === 429) {
    return { kind: 'rateLimit', status, detail }
  }
  if (status >= 500) {
    return { kind: 'server', status, detail }
  }
  if (status === 404) {
    // 404 既可能是路径错，也可能是模型不存在，靠错误文案区分
    return { kind: isModelError(detail) ? 'modelNotFound' : 'notFound', status, detail }
  }
  if (status === 400 && isModelError(detail)) {
    return { kind: 'modelNotFound', status, detail }
  }

  return { kind: 'unknown', status, detail }
}

/** 错误文案是否指向「模型不存在 / 无权访问」 */
function isModelError(detail?: string): boolean {
  if (!detail) return false
  const text = detail.toLowerCase()
  return (
    text.includes('model') &&
    (text.includes('not found') ||
      text.includes('does not exist') ||
      text.includes('not exist') ||
      text.includes('unsupported') ||
      text.includes('invalid') ||
      text.includes('no permission') ||
      text.includes('unavailable'))
  )
}

/** 从各家风格不一的错误响应里挖出人类可读的信息 */
export function extractErrorMessage(error: any): string | undefined {
  const data = error?.response?.data
  if (!data) return error?.message

  if (typeof data === 'string') return data.slice(0, 500)

  const candidates = [
    data?.error?.message,
    data?.error?.msg,
    data?.error,
    data?.message,
    data?.msg,
    data?.detail,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().slice(0, 500)
    }
  }

  try {
    return JSON.stringify(data).slice(0, 500)
  } catch {
    return error?.message
  }
}

/**
 * 从 /models 响应里解析出模型 id 列表
 *
 * 兼容三种形态：OpenAI 标准的 `{data:[{id}]}`、直接返回数组、以及
 * 数组元素是纯字符串的简化实现。
 */
export function parseModelList(data: any): string[] {
  const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : null
  if (!rawList) return []

  const ids: string[] = []
  for (const entry of rawList) {
    const id = typeof entry === 'string' ? entry : entry?.id || entry?.model || entry?.name
    if (typeof id === 'string' && id.trim() && !ids.includes(id.trim())) {
      ids.push(id.trim())
    }
  }
  return ids
}

/** 明显不是对话模型的名字特征，用于排序降权（不删除，避免误伤） */
const NON_CHAT_PATTERNS = [
  /embed/i,
  /whisper/i,
  /\btts\b/i,
  /speech/i,
  /audio/i,
  /dall-?e/i,
  /moderation/i,
  /rerank/i,
  /image/i,
  /video/i,
]

/** 该模型名看起来是否为对话模型 */
export function isLikelyChatModel(model: string): boolean {
  return !NON_CHAT_PATTERNS.some(pattern => pattern.test(model))
}

/** 对话模型排前面，其余按字母序排后面 */
export function sortModels(models: string[]): string[] {
  return [...models].sort((a, b) => {
    const chatA = isLikelyChatModel(a)
    const chatB = isLikelyChatModel(b)
    if (chatA !== chatB) return chatA ? -1 : 1
    return a.localeCompare(b)
  })
}

/**
 * 用 no-cors 请求判断服务端到底可不可达
 *
 * 普通跨域请求失败时，浏览器出于安全考虑不告诉 JS 究竟是「域名解析不了」
 * 还是「服务端没放行跨域」——两者都只是一个没有 response 的错误。
 * 但 no-cors 模式不校验 CORS 头：它能拿到 opaque 响应就说明请求真的发出去
 * 且服务端回应了，那么原先的失败必然出在 CORS 上。
 *
 * 只在浏览器里有意义；拿不准时返回 false，让调用方退回到较保守的结论。
 */
export async function probeReachableWithoutCors(
  url: string,
  signal?: AbortSignal
): Promise<boolean> {
  if (typeof fetch !== 'function') return false
  try {
    // 刻意不带 Authorization：带了就成了非简单请求，又会触发预检
    await fetch(url, { mode: 'no-cors', method: 'GET', signal })
    return true
  } catch {
    return false
  }
}

/** 创建一个仅用于探测的轻量客户端 */
function createProbeClient(baseUrl: string, apiKey: string, timeout: number): AxiosInstance {
  return axios.create({
    baseURL: baseUrl,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  })
}

export interface FetchModelsOptions {
  apiUrl: string
  apiKey: string
  timeout?: number
  signal?: AbortSignal
}

export interface FetchModelsResult {
  /** 实际连通的 base URL，可能是候选里的第二个 */
  resolvedApiUrl: string
  models: string[]
}

/**
 * 拉取模型列表，并顺带确定真正可用的 base URL
 *
 * 会依次尝试 {@link buildBaseUrlCandidates} 的候选。只有「路径不存在」
 * 才继续试下一个——鉴权失败、限流这类错误说明路径本身是对的，
 * 再换路径只会掩盖真正的问题。
 */
export async function fetchModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  const { apiUrl, apiKey, timeout = 15000, signal } = options
  const candidates = buildBaseUrlCandidates(apiUrl)

  if (candidates.length === 0) {
    throw Object.assign(new Error('API URL is empty'), { classified: { kind: 'notFound' } })
  }

  let lastError: any = null

  for (const candidate of candidates) {
    try {
      const client = createProbeClient(candidate, apiKey, timeout)
      const response = await client.get('/models', { signal })
      const models = parseModelList(response.data)

      if (models.length === 0) {
        // 能连通说明路径是对的，换候选只会让 404 覆盖掉「格式不规范」这个真实原因
        throw Object.assign(new Error('No models in response'), {
          classified: { kind: 'badResponse' as ApiErrorKind },
        })
      }

      return { resolvedApiUrl: candidate, models: sortModels(models) }
    } catch (error: any) {
      const classified = error?.classified ?? classifyApiError(error)
      lastError = Object.assign(error, { classified })

      // 只有「路径不存在」才值得换候选。DNS 失败、CORS 被拦、服务未启动这些
      // 都与路径无关，对同一 host 的另一个候选必然同样失败，换了只是让用户多等一个超时。
      if (classified.kind !== 'notFound') throw lastError
    }
  }

  throw lastError
}

export interface DiagnoseOptions {
  apiUrl: string
  apiKey: string
  model: string
  timeout?: number
  signal?: AbortSignal
  /**
   * 实际发一次对话请求做端到端验证。
   * 由调用方注入，避免这一层重复实现翻译逻辑。
   */
  probeChat: (resolvedApiUrl: string) => Promise<string>
}

/**
 * 分步诊断 API 配置
 *
 * 逐步定位问题：配置完整性 → 端点可达 → 鉴权 → 模型可用 → 实际对话。
 * 每步单独给出结论，用户能一眼看出卡在哪一环，而不是只看到「连接失败」。
 */
export async function diagnoseEndpoint(options: DiagnoseOptions): Promise<DiagnosticReport> {
  const { apiUrl, apiKey, model, timeout = 15000, signal, probeChat } = options
  const steps: DiagnosticStep[] = []

  // 步骤 1：本地配置检查，不发请求
  if (!apiUrl?.trim()) {
    steps.push({ id: 'config', status: 'error', messageKey: 'missingUrl' })
    return { ok: false, steps }
  }
  if (!apiKey?.trim()) {
    steps.push({ id: 'config', status: 'error', messageKey: 'missingKey' })
    return { ok: false, steps }
  }

  const normalized = normalizeApiBaseUrl(apiUrl)
  const urlChanged = normalized !== apiUrl.trim().replace(/\/+$/, '')
  steps.push({
    id: 'config',
    status: 'success',
    messageKey: urlChanged ? 'configNormalized' : 'configOk',
    messageParams: urlChanged ? { url: normalized } : undefined,
  })

  // 步骤 2 & 3：端点探测 + 鉴权（一次 /models 请求同时验证两者）
  // 用首个候选而非 normalized：后者不带版本段，一旦 /models 探测失败走降级分支，
  // 后面的 chat 探测就会打到 /chat/completions 而不是 /v1/chat/completions。
  let resolvedApiUrl = buildBaseUrlCandidates(apiUrl)[0] ?? normalized
  let models: string[] | undefined

  try {
    const result = await fetchModels({ apiUrl, apiKey, timeout, signal })
    resolvedApiUrl = result.resolvedApiUrl
    models = result.models
    steps.push({
      id: 'endpoint',
      status: 'success',
      messageKey: 'endpointOk',
      messageParams: { url: resolvedApiUrl },
    })
    steps.push({ id: 'auth', status: 'success', messageKey: 'authOk' })
  } catch (error: any) {
    const classified: ClassifiedApiError = error?.classified ?? classifyApiError(error)

    if (classified.kind === 'cancelled') {
      steps.push({ id: 'endpoint', status: 'error', messageKey: 'cancelled' })
      return { ok: false, steps }
    }

    if (classified.kind === 'auth') {
      // 路径通了但鉴权没过：端点算成功，问题定位到 Key
      steps.push({
        id: 'endpoint',
        status: 'success',
        messageKey: 'endpointOk',
        messageParams: { url: resolvedApiUrl },
      })
      steps.push({
        id: 'auth',
        status: 'error',
        messageKey: 'authFailed',
        detail: classified.detail,
      })
      return { ok: false, steps, resolvedApiUrl }
    }

    if (classified.kind === 'timeout') {
      steps.push({
        id: 'endpoint',
        status: 'error',
        messageKey: 'endpointTimeout',
        detail: classified.detail,
      })
      return { ok: false, steps }
    }

    if (classified.kind === 'network') {
      // 再探一次：能连上却失败，说明卡在 CORS 而不是网络
      const reachable = await probeReachableWithoutCors(resolvedApiUrl, signal)
      steps.push({
        id: 'endpoint',
        status: 'error',
        messageKey: reachable ? 'endpointCorsBlocked' : 'endpointUnreachable',
        detail: classified.detail,
      })
      return { ok: false, steps, resolvedApiUrl }
    }

    // /models 不是所有服务都实现（404），或响应不规范。
    // 这不阻断使用，降级为警告，继续用实际对话来验证。
    steps.push({
      id: 'endpoint',
      status: 'warning',
      messageKey: classified.kind === 'badResponse' ? 'modelsBadResponse' : 'modelsUnsupported',
      detail: classified.detail,
    })
    steps.push({ id: 'auth', status: 'skipped', messageKey: 'authSkipped' })
  }

  // 步骤 4：模型可用性。模型列表拉不到时无法核对，跳过
  if (!model?.trim()) {
    steps.push({ id: 'model', status: 'error', messageKey: 'missingModel' })
    return { ok: false, steps, resolvedApiUrl, models }
  }
  if (models && models.length > 0) {
    if (models.includes(model)) {
      steps.push({
        id: 'model',
        status: 'success',
        messageKey: 'modelOk',
        messageParams: { model },
      })
    } else {
      // 有些服务的 /models 并不返回全部可用模型，只警告不阻断
      steps.push({
        id: 'model',
        status: 'warning',
        messageKey: 'modelNotListed',
        messageParams: { model },
      })
    }
  } else {
    steps.push({ id: 'model', status: 'skipped', messageKey: 'modelSkipped' })
  }

  // 步骤 5：端到端发一次真实对话请求
  try {
    const sample = await probeChat(resolvedApiUrl)
    steps.push({
      id: 'chat',
      status: 'success',
      messageKey: 'chatOk',
      messageParams: { sample: sample.slice(0, 80) },
    })
    return { ok: true, steps, resolvedApiUrl, models }
  } catch (error: any) {
    const classified: ClassifiedApiError = error?.classified ?? classifyApiError(error)
    steps.push({
      id: 'chat',
      status: 'error',
      messageKey: chatErrorMessageKey(classified.kind),
      detail: classified.detail,
    })
    return { ok: false, steps, resolvedApiUrl, models }
  }
}

/** 对话步骤失败原因 → 文案 key */
function chatErrorMessageKey(kind: ApiErrorKind): string {
  switch (kind) {
    case 'cancelled':
      return 'cancelled'
    case 'timeout':
      return 'chatTimeout'
    case 'network':
      return 'endpointUnreachable'
    case 'auth':
      return 'authFailed'
    case 'modelNotFound':
      return 'chatModelNotFound'
    case 'rateLimit':
      return 'chatRateLimit'
    case 'server':
      return 'chatServerError'
    case 'notFound':
      return 'chatNotFound'
    case 'badResponse':
      return 'chatBadResponse'
    default:
      return 'chatFailed'
  }
}
