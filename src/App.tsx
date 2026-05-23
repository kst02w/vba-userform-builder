import { FormInput, Wand2, Play, Download } from 'lucide-react'

function App() {
  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <FormInput className="h-5 w-5 text-indigo-600" />
          <h1 className="text-lg font-semibold">VBA UserForm Builder</h1>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            P0 / Skeleton
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            <Wand2 className="h-4 w-4" /> AI生成
          </button>
          <button className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            <Play className="h-4 w-4" /> プレビュー
          </button>
          <button className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            <Download className="h-4 w-4" /> エクスポート
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-60 border-r border-slate-200 bg-white p-3 text-sm">
          <div className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              プロジェクト
            </h2>
            <div className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
              （P1で実装）
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              ツールボックス
            </h2>
            <div className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
              （P1で実装）
            </div>
          </div>
        </aside>

        <section className="flex flex-1 items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <FormInput className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-700">
              VBA UserForm Builder
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              P0 デプロイ動作確認用の最小骨格です。
            </p>
            <p className="mt-1 text-xs text-slate-400">
              次フェーズ (P1) で D&D ビルダーを実装します。
            </p>
          </div>
        </section>

        <aside className="w-72 border-l border-slate-200 bg-white p-3 text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            プロパティ
          </h2>
          <div className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
            （P1で実装）
          </div>
        </aside>
      </main>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-1 text-xs text-slate-400">
        <span>Phase 0: スケルトン</span>
        <span>kst02w / vba-userform-builder</span>
      </footer>
    </div>
  )
}

export default App
