import { useEffect, useRef, useState } from 'react'
import { X, Wand2, Key, Loader2, Image as ImageIcon } from 'lucide-react'
import { useProjectStore } from '../store/project'
import {
  generate,
  fileToImageBlock,
  loadApiKey,
  saveApiKey,
  type ContentBlock,
} from '../lib/claude-api'
import {
  extractJson,
  SYSTEM_PROMPT,
  specToUserForm,
  type AIFormSpec,
} from '../lib/ai-prompts'

export function AIGeneratorDialog({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const imgInput = useRef<HTMLInputElement | null>(null)

  const loadProject = useProjectStore((s) => s.loadProject)
  const currentProject = useProjectStore((s) => s.project)
  const workbook = useProjectStore((s) => s.project.workbook)

  useEffect(() => {
    loadApiKey().then((k) => {
      if (k) {
        setApiKey(k)
      } else {
        setShowKey(true)
      }
    })
  }, [])

  const onAddImages = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImages((prev) => [...prev, ...arr])
  }

  const generateForm = async () => {
    if (!apiKey || !prompt.trim()) return
    setBusy(true)
    setError(null)
    setPreview(null)
    try {
      await saveApiKey(apiKey)
      const userBlocks: ContentBlock[] = []
      if (images.length > 0) {
        for (const f of images) userBlocks.push(await fileToImageBlock(f))
      }
      let userText = prompt
      if (workbook) {
        const sheetsSummary = workbook.sheets
          .slice(0, 5)
          .map((s) => `- ${s.name}: 列 [${s.headers.slice(0, 8).join(', ')}] (${s.rowCount}行)`)
          .join('\n')
        userText += `\n\n【参考: アップロード済みワークブック "${workbook.fileName}"】\n${sheetsSummary}`
      }
      userBlocks.push({ type: 'text', text: userText })

      const result = await generate({
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        userBlocks,
      })
      setPreview(result.text)
      // Parse + apply
      const spec = extractJson(result.text) as AIFormSpec
      const form = specToUserForm(spec)
      // Append to project (don't replace existing)
      loadProject({
        ...currentProject,
        forms: [...currentProject.forms, form],
        selectedFormId: form.id,
        selectedControlId: undefined,
        editorTarget: { kind: 'form', formId: form.id },
        view: 'designer',
      })
      // Close shortly after success
      setTimeout(onClose, 600)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold">AI 生成 (Claude API)</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 text-sm">
          <details
            open={showKey || !apiKey}
            className="mb-4 rounded border border-slate-200 bg-slate-50 p-3"
          >
            <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-700">
              <Key className="h-3 w-3" /> Anthropic API キー
            </summary>
            <p className="mt-2 text-[11px] text-slate-500">
              ブラウザのIndexedDBにのみ保存され、Anthropic以外には送信されません。
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                console.anthropic.com
              </a>
              で発行できます。
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs outline-none focus:border-indigo-400"
            />
          </details>

          <label className="mb-1 block text-xs font-semibold text-slate-700">
            どんなフォームを作りたいですか？
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="例: 顧客情報の登録フォーム。氏名、フリガナ、電話番号、メールアドレス、生年月日、性別（男/女）、住所、備考、メルマガ希望チェック、最後に登録ボタンとキャンセルボタン。"
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-400"
          />

          <div className="mt-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              参考画像 (任意)
            </label>
            <input
              ref={imgInput}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                onAddImages(e.target.files)
                e.target.value = ''
              }}
              className="hidden"
            />
            <button
              onClick={() => imgInput.current?.click()}
              className="flex items-center gap-1 rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <ImageIcon className="h-3.5 w-3.5" /> 画像を追加
            </button>
            {images.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                {images.map((f, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {f.name}
                    <button
                      onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                      className="text-rose-500 hover:underline"
                    >
                      [削除]
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {workbook && (
            <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
              アップロード済みのワークブック「{workbook.fileName}」の構造もコンテキストとして送信されます。
            </p>
          )}

          {error && (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
              {error}
            </p>
          )}

          {preview && (
            <details className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-[11px]">
              <summary className="cursor-pointer font-semibold text-slate-600">
                Claude からのレスポンス
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                {preview}
              </pre>
            </details>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px]">
          <span className="text-slate-500">claude-opus-4-7</span>
          <button
            onClick={generateForm}
            disabled={busy || !apiKey || !prompt.trim()}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-300"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? '生成中…' : '生成'}
          </button>
        </footer>
      </div>
    </div>
  )
}
