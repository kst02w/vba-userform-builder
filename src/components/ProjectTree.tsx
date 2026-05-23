import { FilePlus, FormInput, Trash2 } from 'lucide-react'
import { useProjectStore } from '../store/project'
import { cn } from '../lib/utils'

export function ProjectTree() {
  const projectName = useProjectStore((s) => s.project.name)
  const forms = useProjectStore((s) => s.project.forms)
  const selectedFormId = useProjectStore((s) => s.project.selectedFormId)
  const selectForm = useProjectStore((s) => s.selectForm)
  const addForm = useProjectStore((s) => s.addForm)
  const deleteForm = useProjectStore((s) => s.deleteForm)
  const renameProject = useProjectStore((s) => s.renameProject)

  return (
    <div className="text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          プロジェクト
        </h2>
        <button
          onClick={addForm}
          title="新規フォーム"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <FilePlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        value={projectName}
        onChange={(e) => renameProject(e.target.value)}
        className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
      />
      <ul className="space-y-0.5">
        {forms.map((f) => (
          <li
            key={f.id}
            className={cn(
              'group flex items-center justify-between rounded px-2 py-1 hover:bg-slate-100',
              selectedFormId === f.id && 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50',
            )}
          >
            <button
              onClick={() => selectForm(f.id)}
              className="flex flex-1 items-center gap-1.5 text-left"
            >
              <FormInput className="h-3.5 w-3.5" />
              <span className="truncate">{f.name}</span>
              <span className="ml-1 text-xs text-slate-400">({f.controls.length})</span>
            </button>
            {forms.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`「${f.name}」を削除しますか？`)) deleteForm(f.id)
                }}
                title="削除"
                className="invisible rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 group-hover:visible"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
