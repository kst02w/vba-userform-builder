import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, Trash2, ChevronDown, ChevronRight, Wand2 } from 'lucide-react'
import { useProjectStore, selectActiveForm } from '../store/project'
import { parseWorkbookFile } from '../lib/xlsx-reader'
import { buildMappingCode, mergeMappingCode } from '../lib/codegen-mapping'
import { cn } from '../lib/utils'

export function WorkbookSection() {
  const workbook = useProjectStore((s) => s.project.workbook)
  const setWorkbook = useProjectStore((s) => s.setWorkbook)
  const form = useProjectStore(selectActiveForm)
  const setFormCode = useProjectStore((s) => s.setFormCode)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSheet, setOpenSheet] = useState<string | null>(null)

  const onPick = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const wb = await parseWorkbookFile(file)
      setWorkbook(wb)
      if (wb.sheets[0]) setOpenSheet(wb.sheets[0].name)
    } catch (e) {
      setError((e as Error).message ?? 'パース失敗')
    } finally {
      setBusy(false)
    }
  }

  const regen = () => {
    if (!form) return
    const block = buildMappingCode(form)
    const merged = mergeMappingCode(form.code, block)
    setFormCode(form.id, merged)
  }

  return (
    <div className="text-sm">
      <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        ワークブック
      </h2>

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />

      {!workbook && (
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 px-2 py-3 text-xs text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? '読込中…' : 'Excelファイルを選択'}
        </button>
      )}

      {workbook && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
            <div className="min-w-0 flex-1 truncate" title={workbook.fileName}>
              <span className="font-medium text-slate-700">{workbook.fileName}</span>
              <span className="ml-1 text-slate-400">({workbook.sheets.length}シート)</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInput.current?.click()}
                title="差し替え"
                className="rounded p-1 text-slate-500 hover:bg-slate-200"
              >
                <Upload className="h-3 w-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm('ワークブック情報を削除しますか？')) setWorkbook(undefined)
                }}
                title="削除"
                className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <ul className="space-y-0.5">
            {workbook.sheets.map((s) => {
              const open = openSheet === s.name
              return (
                <li key={s.name}>
                  <button
                    onClick={() => setOpenSheet(open ? null : s.name)}
                    className={cn(
                      'flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs hover:bg-slate-100',
                      open && 'bg-slate-100',
                    )}
                  >
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="font-mono">{s.name}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{s.rowCount}行</span>
                  </button>
                  {open && (
                    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                      <table className="min-w-full text-[10px]">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-1 py-0.5 text-left">#</th>
                            {s.headers.map((h, i) => (
                              <th key={i} className="px-1 py-0.5 text-left" title={h}>
                                {h || `列${i + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.previewRows.map((row, ri) => (
                            <tr key={ri} className="border-t border-slate-100">
                              <td className="px-1 py-0.5 text-slate-400">{ri + 2}</td>
                              {row.map((v, ci) => (
                                <td key={ci} className="max-w-[10ch] truncate px-1 py-0.5">
                                  {v === null || v === undefined ? '' : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {form && (
            <button
              onClick={regen}
              className="flex w-full items-center justify-center gap-1 rounded bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              title="マッピングからInitialize/SubmitのVBAを生成"
            >
              <Wand2 className="h-3.5 w-3.5" />
              コード再生成
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{error}</p>
      )}
    </div>
  )
}
