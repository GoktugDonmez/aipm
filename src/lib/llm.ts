export type ChatCompletionRole = 'system' | 'user' | 'assistant'

export interface ChatCompletionMessage {
  role: ChatCompletionRole
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: Record<string, unknown>
}

type RuntimeEnv = Record<string, string | undefined>

function readRuntimeEnv(): RuntimeEnv {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    return (import.meta as any).env as RuntimeEnv
  }

  if (typeof globalThis !== 'undefined') {
    const maybeEnv = (globalThis as any)?.process?.env
    if (maybeEnv) {
      return maybeEnv as RuntimeEnv
    }
  }

  return {}
}

const runtimeEnv = readRuntimeEnv()

const OPENAI_API_KEY =
  runtimeEnv.VITE_OPENAI_API_KEY || runtimeEnv.OPENAI_API_KEY || ''
const OPENAI_BASE_URL =
  runtimeEnv.VITE_OPENAI_BASE_URL || runtimeEnv.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const DEFAULT_MODEL =
  runtimeEnv.VITE_OPENAI_MODEL || runtimeEnv.OPENAI_MODEL || 'gpt-4o-mini'

export function isLLMAvailable(): boolean {
  return Boolean(OPENAI_API_KEY)
}

export function getDefaultModel(): string {
  return DEFAULT_MODEL
}

export async function createChatCompletion(
  messages: ChatCompletionMessage[],
  options: ChatCompletionOptions = {}
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Please set it in your .env file.')
  }

  const payload = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 400,
    response_format: options.responseFormat,
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || 'LLM request failed'
    throw new Error(message)
  }

  return data
}
