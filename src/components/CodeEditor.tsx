import { useEffect, useMemo, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as monacoNs from 'monaco-editor'
import { Plus, Trash2, FileCode2, FormInput as FormIcon } from 'lucide-react'
import {
  selectActiveForm,
  useProjectStore,
} from '../store/project'
import type { EditorTarget } from '../types/project'
import {
  VBA_LANGUAGE_ID,
  vbaLanguageConfig,
  vbaMonarchLanguage,
} from '../lib/vba-language'
import {
  createVbaCompletionProvider,
  createVbaHoverProvider,
} from '../lib/vba-completion'
import { EventStubPanel } from './EventStubPanel'
import { cn } from '../lib/utils'

let vbaLanguageRegistered = false

function ensureVbaLanguage(monaco: typeof monacoNs) {
  if (vbaLanguageRegistered) return
  vbaLanguageRegistered = true
  monaco.languages.register({ id: VBA_LANGUAGE_ID })
  monaco.languages.setMonarchTokensProvider(VBA_LANGUAGE_ID, vbaMonarchLanguage)
  monaco.languages.setLanguageConfiguration(VBA_LANGUAGE_ID, vbaLanguageConfig)
  monaco.editor.defineTheme('vba-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
      { token: 'predefined', foreground: '7e3aff' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'string', foreground: 'a31515' },
      { token: 'string.date', foreground: 'b06000' },
      { token: 'number', foreground: '098658' },
      { token: 'metatag', foreground: '7f7f7f', fontStyle: 'italic' },
    ],
    colors: {},
  })
}

export function CodeEditor() {
  const target = useProjectStore((s) => s.project.editorTarget)
  const form = useProjectStore(selectActiveForm)
  const forms = useProjectStore((s) => s.project.forms)
  const modules = useProjectStore((s) => s.project.modules)
  const setTarget = useProjectStore((s) => s.setEditorTarget)
  const setFormCode = useProjectStore((s) => s.setFormCode)
  const setModuleCode = useProjectStore((s) => s.setModuleCode)
  const addModule = useProjectStore((s) => s.addModule)
  const deleteModule = useProjectStore((s) => s.deleteModule)

  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof monacoNs | null>(null)

  // current source
  const { code, displayName, kind } = useMemo(() => {
    if (target?.kind === 'form') {
      const f = forms.find((x) => x.id === target.formId)
      return { code: f?.code ?? '', displayName: f?.name ?? '', kind: 'form' as const }
    }
    if (target?.kind === 'module') {
      const m = modules.find((x) => x.id === target.moduleId)
      return { code: m?.code ?? '', displayName: m?.name ?? '', kind: 'module' as const }
    }
    return { code: '', displayName: '', kind: 'form' as const }
  }, [target, forms, modules])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    ensureVbaLanguage(monaco)

    monaco.languages.registerCompletionItemProvider(
      VBA_LANGUAGE_ID,
      createVbaCompletionProvider(monaco, () => ({ form })),
    )
    monaco.languages.registerHoverProvider(
      VBA_LANGUAGE_ID,
      createVbaHoverProvider(() => ({ form })),
    )
  }

  // Re-create providers when form changes (close over latest form)
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    const completionDispose = monaco.languages.registerCompletionItemProvider(
      VBA_LANGUAGE_ID,
      createVbaCompletionProvider(monaco, () => ({ form })),
    )
    const hoverDispose = monaco.languages.registerHoverProvider(
      VBA_LANGUAGE_ID,
      createVbaHoverProvider(() => ({ form })),
    )
    return () => {
      completionDispose.dispose()
      hoverDispose.dispose()
    }
  }, [form])

  const handleChange = (value: string | undefined) => {
    const v = value ?? ''
    if (target?.kind === 'form') setFormCode(target.formId, v)
    else if (target?.kind === 'module') setModuleCode(target.moduleId, v)
  }

  const selectTarget = (t: EditorTarget) => setTarget(t)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Module list sidebar */}
      <aside className="flex w-48 flex-col gap-2 border-r border-slate-200 bg-white p-2 text-sm">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            フォーム コード
          </h3>
          <ul className="space-y-0.5">
            {forms.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => selectTarget({ kind: 'form', formId: f.id })}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-slate-100',
                    target?.kind === 'form' && target.formId === f.id
                      && 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50',
                  )}
                >
                  <FormIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              モジュール
            </h3>
            <button
              onClick={() => addModule('standard')}
              title="標準モジュールを追加"
              className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-0.5">
            {modules.length === 0 && (
              <li className="px-2 text-[11px] text-slate-400">なし</li>
            )}
            {modules.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'group flex items-center justify-between rounded hover:bg-slate-100',
                  target?.kind === 'module' && target.moduleId === m.id
                    && 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50',
                )}
              >
                <button
                  onClick={() => selectTarget({ kind: 'module', moduleId: m.id })}
                  className="flex flex-1 items-center gap-1.5 px-2 py-1 text-left text-xs"
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span className="truncate">{m.name}</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`「${m.name}」を削除しますか？`)) deleteModule(m.id)
                  }}
                  title="削除"
                  className="invisible p-1 text-slate-400 hover:text-rose-600 group-hover:visible"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Editor + events */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          <span>
            {displayName}{' '}
            <span className="text-slate-400">
              {kind === 'form' ? '(UserForm code-behind)' : '(Module)'}
            </span>
          </span>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <Editor
              theme="vba-light"
              language={VBA_LANGUAGE_ID}
              value={code}
              onMount={handleMount}
              onChange={handleChange}
              path={
                target?.kind === 'form'
                  ? `${displayName}.frm.vba`
                  : `${displayName}.bas`
              }
              options={{
                fontSize: 13,
                fontFamily: 'Consolas, "MS Gothic", monospace',
                minimap: { enabled: false },
                tabSize: 4,
                insertSpaces: true,
                automaticLayout: true,
                wordWrap: 'on',
                renderWhitespace: 'selection',
                scrollBeyondLastLine: false,
              }}
            />
          </div>
          {kind === 'form' && form && (
            <aside className="w-60 overflow-auto border-l border-slate-200 bg-white">
              <EventStubPanel formId={form.id} />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
