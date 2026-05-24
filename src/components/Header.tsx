import { useState } from 'react'
import { FormInput, Wand2, Play, Undo2, Redo2, LayoutDashboard, FileCode2 } from 'lucide-react'
import { useProjectStore, useTemporal, selectActiveForm } from '../store/project'
import { ExportMenu } from './ExportMenu'
import { PreviewModal } from './PreviewModal'
import { AIGeneratorDialog } from './AIGeneratorDialog'
import { TemplatePickerDialog } from './TemplatePickerDialog'
import { cn } from '../lib/utils'

export function Header() {
  const undo = useTemporal((s) => s.undo)
  const redo = useTemporal((s) => s.redo)
  const pastStates = useTemporal((s) => s.pastStates)
  const futureStates = useTemporal((s) => s.futureStates)
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  const view = useProjectStore((s) => s.project.view ?? 'designer')
  const setView = useProjectStore((s) => s.setView)
  const form = useProjectStore(selectActiveForm)

  const [showPreview, setShowPreview] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <FormInput className="h-5 w-5 text-indigo-600" />
        <h1 className="text-base font-semibold">VBA UserForm Builder</h1>
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
          v1.0 / All features
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
        <button
          onClick={() => setView('designer')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            view === 'designer'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100',
          )}
          title="デザイナ (F7)"
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> デザイナ
        </button>
        <button
          onClick={() => setView('code')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            view === 'code'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100',
          )}
          title="コード (Shift+F7)"
        >
          <FileCode2 className="h-3.5 w-3.5" /> コード
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
          <button
            onClick={() => undo()}
            disabled={!canUndo}
            title="元に戻す (Ctrl+Z)"
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            title="やり直し (Ctrl+Y)"
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          title="テンプレートから新規"
        >
          <FormInput className="h-4 w-4" /> テンプレ
        </button>
        <button
          onClick={() => setShowAI(true)}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          title="Claude で自然言語からフォーム生成"
        >
          <Wand2 className="h-4 w-4" /> AI生成
        </button>
        <button
          onClick={() => setShowPreview(true)}
          disabled={!form}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          title="VBAインタプリタでプレビュー実行"
        >
          <Play className="h-4 w-4" /> プレビュー
        </button>
        <ExportMenu />
      </div>
      {showPreview && <PreviewModal onClose={() => setShowPreview(false)} />}
      {showAI && <AIGeneratorDialog onClose={() => setShowAI(false)} />}
      {showTemplates && <TemplatePickerDialog onClose={() => setShowTemplates(false)} />}
    </header>
  )
}
