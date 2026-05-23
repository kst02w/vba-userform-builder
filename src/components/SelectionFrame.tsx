import type { PointerEvent } from 'react'
import { useProjectStore } from '../store/project'

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { id: HandleId; cursor: string; x: number; y: number }[] = [
  { id: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
  { id: 'n', cursor: 'ns-resize', x: 0.5, y: 0 },
  { id: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
  { id: 'e', cursor: 'ew-resize', x: 1, y: 0.5 },
  { id: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
  { id: 's', cursor: 'ns-resize', x: 0.5, y: 1 },
  { id: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
  { id: 'w', cursor: 'ew-resize', x: 0, y: 0.5 },
]

export function SelectionFrame({
  formId,
  controlId,
}: {
  formId: string
  controlId: string
}) {
  const control = useProjectStore((s) => {
    const f = s.project.forms.find((x) => x.id === formId)
    return f?.controls.find((c) => c.id === controlId)
  })
  const setControlRect = useProjectStore((s) => s.setControlRect)
  if (!control) return null

  const onResizeStart =
    (handleId: HandleId) => (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const start = {
        left: control.left,
        top: control.top,
        width: control.width,
        height: control.height,
      }
      const onMove = (ev: globalThis.PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        let { left, top, width, height } = start
        if (handleId.includes('w')) {
          left += dx
          width -= dx
        }
        if (handleId.includes('e')) {
          width += dx
        }
        if (handleId.includes('n')) {
          top += dy
          height -= dy
        }
        if (handleId.includes('s')) {
          height += dy
        }
        if (width < 8) {
          if (handleId.includes('w')) left -= 8 - width
          width = 8
        }
        if (height < 8) {
          if (handleId.includes('n')) top -= 8 - height
          height = 8
        }
        setControlRect(formId, controlId, { left, top, width, height })
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: control.left - 2,
          top: control.top - 2,
          width: control.width + 4,
          height: control.height + 4,
          border: '1px dashed #6366f1',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={onResizeStart(h.id)}
          style={{
            position: 'absolute',
            left: control.left + control.width * h.x - 4,
            top: control.top + control.height * h.y - 4,
            width: 8,
            height: 8,
            background: '#fff',
            border: '1px solid #6366f1',
            cursor: h.cursor,
            zIndex: 4,
          }}
        />
      ))}
    </>
  )
}
