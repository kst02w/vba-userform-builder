import { X, FormInput } from 'lucide-react'
import { useProjectStore } from '../store/project'
import { TEMPLATES, templateToForm } from '../lib/templates'

export function TemplatePickerDialog({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project)
  const loadProject = useProjectStore((s) => s.loadProject)

  const pick = (templateId: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId)
    if (!t) return
    const form = templateToForm(t)
    loadProject({
      ...project,
      forms: [...project.forms, form],
      selectedFormId: form.id,
      selectedControlId: undefined,
      editorTarget: { kind: 'form', formId: form.id },
      view: 'designer',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <FormInput className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold">テンプレートから新規作成</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => pick(t.id)}
                  className="flex h-full w-full flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="text-sm font-semibold text-slate-800">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.description}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                      {t.controls.length} コントロール
                    </span>
                    <span>{t.width}×{t.height}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          選択するとプロジェクトに新しいフォームとして追加されます
        </footer>
      </div>
    </div>
  )
}
