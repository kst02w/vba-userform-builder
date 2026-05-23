import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { forwardRef, useCallback } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useProjectStore, selectActiveForm } from '../store/project'
import type { ControlBase } from '../types/project'
import { ControlView } from './ControlView'
import { SelectionFrame } from './SelectionFrame'

function DraggableControl({
  control,
  formId,
}: {
  control: ControlBase
  formId: string
}) {
  const selectControl = useProjectStore((s) => s.selectControl)
  const isSelected = useProjectStore(
    (s) => s.project.selectedControlId === control.id,
  )
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `ctrl:${control.id}`,
      data: { source: 'ctrl', controlId: control.id, formId },
    })

  const style: CSSProperties = {
    position: 'absolute',
    left: control.left,
    top: control.top,
    width: control.width,
    height: control.height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isSelected ? 2 : 1,
    opacity: isDragging ? 0.7 : 1,
    cursor: 'move',
  }

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation()
      selectControl(control.id)
    },
    [selectControl, control.id],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseDown={handleMouseDown}
      {...listeners}
      {...attributes}
    >
      <ControlView control={control} />
    </div>
  )
}

export const Canvas = forwardRef<HTMLDivElement>(function Canvas(_, formRef) {
  const form = useProjectStore(selectActiveForm)
  const selectedId = useProjectStore((s) => s.project.selectedControlId)
  const selectControl = useProjectStore((s) => s.selectControl)
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  if (!form) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-100 text-sm text-slate-400">
        フォームを選択してください
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-slate-200 pt-12 pb-8">
      <div
        ref={(el) => {
          setNodeRef(el)
          if (typeof formRef === 'function') formRef(el)
          else if (formRef) (formRef as { current: HTMLDivElement | null }).current = el
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) selectControl(undefined)
        }}
        style={{
          width: form.width,
          height: form.height,
          background: form.backColor,
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: '1px solid #555',
          outline: isOver ? '2px solid #6366f1' : 'none',
          outlineOffset: 2,
        }}
      >
        {/* faux title bar */}
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: -1,
            right: -1,
            height: 22,
            background: 'linear-gradient(to bottom, #4a90e2, #2563eb)',
            color: '#fff',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px',
            border: '1px solid #555',
            borderBottom: 'none',
            userSelect: 'none',
          }}
        >
          <span>{form.caption}</span>
          <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>− □ ×</span>
        </div>

        {form.controls.map((c) => (
          <DraggableControl key={c.id} control={c} formId={form.id} />
        ))}
        {selectedId && (
          <SelectionFrame formId={form.id} controlId={selectedId} />
        )}
      </div>
    </div>
  )
})
