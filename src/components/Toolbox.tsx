import { useDraggable } from '@dnd-kit/core'
import { CONTROL_CATALOG, type ControlMeta } from '../lib/controls'
import { cn } from '../lib/utils'

function ToolboxItem({ meta }: { meta: ControlMeta }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox:${meta.type}`,
    data: { source: 'toolbox', type: meta.type },
  })
  const Icon = meta.icon
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={meta.label}
      className={cn(
        'flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:border-indigo-400 hover:bg-indigo-50',
        isDragging && 'opacity-40',
      )}
    >
      <Icon className="h-3.5 w-3.5 text-indigo-500" />
      <span className="truncate">{meta.label}</span>
    </button>
  )
}

export function Toolbox() {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        ツールボックス
      </h2>
      <p className="mb-2 text-[10px] text-slate-400">
        キャンバスへドラッグして配置
      </p>
      <div className="grid grid-cols-2 gap-1">
        {CONTROL_CATALOG.map((meta) => (
          <ToolboxItem key={meta.type} meta={meta} />
        ))}
      </div>
    </div>
  )
}
