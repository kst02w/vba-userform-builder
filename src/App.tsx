import { useEffect, useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { ProjectTree } from './components/ProjectTree'
import { Toolbox } from './components/Toolbox'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { CodeEditor } from './components/CodeEditor'
import { useProjectStore, useTemporal } from './store/project'
import { attachPersistence, loadPersistedProject } from './store/persistence'
import type { ControlType } from './types/project'

function App() {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const lastPointer = useRef({ x: 0, y: 0 })

  const addControl = useProjectStore((s) => s.addControl)
  const moveControl = useProjectStore((s) => s.moveControl)
  const deleteControl = useProjectStore((s) => s.deleteControl)
  const selectedFormId = useProjectStore((s) => s.project.selectedFormId)
  const selectedControlId = useProjectStore((s) => s.project.selectedControlId)
  const view = useProjectStore((s) => s.project.view ?? 'designer')
  const setView = useProjectStore((s) => s.setView)
  const loadProject = useProjectStore((s) => s.loadProject)
  const undo = useTemporal((s) => s.undo)
  const redo = useTemporal((s) => s.redo)

  // Hydrate from IndexedDB + attach persistence subscriber
  useEffect(() => {
    let mounted = true
    loadPersistedProject().then((p) => {
      if (mounted && p && p.forms && p.forms.length > 0) loadProject(p)
    })
    const detach = attachPersistence()
    return () => {
      mounted = false
      detach()
    }
  }, [loadProject])

  // Track pointer for toolbox-drop position
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const ctrl = e.ctrlKey || e.metaKey

      // F7 / Shift+F7 view switching
      if (e.key === 'F7') {
        e.preventDefault()
        setView(e.shiftKey ? 'designer' : 'code')
        return
      }

      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (
        ctrl &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        redo()
      } else if (
        view === 'designer' &&
        !isInput &&
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedFormId &&
        selectedControlId
      ) {
        e.preventDefault()
        deleteControl(selectedFormId, selectedControlId)
      } else if (
        view === 'designer' &&
        !isInput &&
        selectedFormId &&
        selectedControlId &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx =
          e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy =
          e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        moveControl(selectedFormId, selectedControlId, dx, dy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, deleteControl, moveControl, selectedFormId, selectedControlId, view, setView])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, delta } = event
    const data = active.data.current as
      | {
          source: string
          type?: ControlType
          controlId?: string
          formId?: string
        }
      | undefined
    if (!data) return

    if (data.source === 'toolbox' && data.type && selectedFormId) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = lastPointer.current.x - rect.left
      const y = lastPointer.current.y - rect.top
      addControl(selectedFormId, data.type, Math.max(0, x), Math.max(0, y))
    } else if (data.source === 'ctrl' && data.controlId && data.formId) {
      moveControl(data.formId, data.controlId, delta.x, delta.y)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex flex-1 overflow-hidden">
          {view === 'designer' ? (
            <>
              <aside className="flex w-60 flex-col gap-4 overflow-auto border-r border-slate-200 bg-white p-3">
                <ProjectTree />
                <Toolbox />
              </aside>
              <Canvas ref={canvasRef} />
              <aside className="w-72 overflow-auto border-l border-slate-200 bg-white">
                <PropertiesPanel />
              </aside>
            </>
          ) : (
            <CodeEditor />
          )}
        </main>
        <Footer />
      </div>
    </DndContext>
  )
}

export default App
