/**
 * Direct Anthropic API client for browser use.
 *
 * The user supplies their API key (stored client-side in IndexedDB). Requests
 * are sent directly from the browser to api.anthropic.com using
 * `anthropic-dangerous-direct-browser-access: true`. This avoids any backend
 * but means the key lives in the browser — appropriate for a personal tool.
 */
import { get as idbGet, set as idbSet } from 'idb-keyval'

const KEY_STORAGE = 'vba-userform-builder/anthropic-key/v1'
const MODEL = 'claude-opus-4-7'
const API_URL = 'https://api.anthropic.com/v1/messages'

export async function loadApiKey(): Promise<string | undefined> {
  try {
    return await idbGet<string>(KEY_STORAGE)
  } catch {
    return undefined
  }
}

export async function saveApiKey(key: string): Promise<void> {
  await idbSet(KEY_STORAGE, key)
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image'
      source: { type: 'base64'; media_type: string; data: string }
    }

export type GenerateOptions = {
  apiKey: string
  systemPrompt: string
  userBlocks: ContentBlock[]
  maxTokens?: number
}

export type GenerateResult = {
  text: string
  usage?: { input_tokens: number; output_tokens: number }
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.systemPrompt,
      messages: [
        { role: 'user', content: opts.userBlocks },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    content: { type: string; text?: string }[]
    usage?: { input_tokens: number; output_tokens: number }
  }
  const text = json.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
  return { text, usage: json.usage }
}

/**
 * Convert a File (image) to a base64 data block.
 */
export async function fileToImageBlock(file: File): Promise<ContentBlock> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return {
    type: 'image',
    source: { type: 'base64', media_type: file.type || 'image/png', data: base64 },
  }
}
