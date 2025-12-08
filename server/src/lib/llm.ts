
import dotenv from 'dotenv'

// Ensure env vars are loaded
dotenv.config()

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

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export async function createChatCompletion(
    messages: ChatCompletionMessage[],
    options: ChatCompletionOptions = {}
): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY in server environment.')
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
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
        const message = (data as any)?.error?.message || 'LLM request failed'
        throw new Error(message)
    }

    return data
}


