import { useMemo } from 'react'
import { useProjectStore } from '../store/project'
import type {
  ControlBase,
  ControlMapping,
  UserForm,
  WorkbookData,
} from '../types/project'
import { colIndexToLetter } from '../lib/xlsx-reader'

const TEXTUAL = new Set(['TextBox', 'ComboBox'])
const BOOLEAN = new Set(['CheckBox', 'OptionButton', 'ToggleButton'])
const LIST = new Set(['ComboBox', 'ListBox'])

export function MappingFields({
  form,
  control,
}: {
  form: UserForm
  control: ControlBase
}) {
  const workbook = useProjectStore((s) => s.project.workbook)
  const setControlMapping = useProjectStore((s) => s.setControlMapping)
  const setSubmitButton = useProjectStore((s) => s.setSubmitButton)
  const setTargetSheet = useProjectStore((s) => s.setTargetSheet)

  const mapping = form.mapping?.controls[control.id]
  const isSubmit = form.mapping?.submitButtonName === control.name

  // For CommandButton: show Submit binding controls
  if (control.type === 'CommandButton') {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isSubmit}
            onChange={(e) =>
              setSubmitButton(form.id, e.target.checked ? control.name : undefined)
            }
            className="h-3.5 w-3.5"
          />
          このボタンを「登録ボタン」にする
        </label>
        {isSubmit && (
          <SheetSelect
            workbook={workbook}
            label="登録先シート"
            value={form.mapping?.targetSheet}
            onChange={(v) => setTargetSheet(form.id, v)}
          />
        )}
        {!workbook && (
          <p className="text-[10px] text-slate-400">
            ワークブックがアップロードされていません。
          </p>
        )}
      </div>
    )
  }

  if (!workbook) {
    return (
      <p className="text-[10px] text-slate-400">
        ワークブックをアップロードするとマッピングできます。
      </p>
    )
  }

  const update = (patch: Partial<ControlMapping>) => {
    const next: ControlMapping = { ...(mapping ?? {}), ...patch }
    // strip empty keys
    const cleaned: ControlMapping = {}
    if (next.source?.sheet && next.source.column) cleaned.source = next.source
    if (next.initFrom?.sheet && next.initFrom.cell) cleaned.initFrom = next.initFrom
    if (next.writeToColumn?.sheet && next.writeToColumn.column)
      cleaned.writeToColumn = next.writeToColumn
    setControlMapping(
      form.id,
      control.id,
      Object.keys(cleaned).length === 0 ? undefined : cleaned,
    )
  }

  return (
    <div className="space-y-2">
      {LIST.has(control.type) && (
        <SourceFields
          workbook={workbook}
          value={mapping?.source}
          onChange={(v) => update({ source: v })}
        />
      )}
      {(TEXTUAL.has(control.type) || BOOLEAN.has(control.type)) && (
        <>
          <InitFromFields
            workbook={workbook}
            value={mapping?.initFrom}
            onChange={(v) => update({ initFrom: v })}
          />
          <WriteToFields
            workbook={workbook}
            value={mapping?.writeToColumn}
            onChange={(v) => update({ writeToColumn: v })}
          />
        </>
      )}
    </div>
  )
}

function SheetSelect({
  workbook,
  label,
  value,
  onChange,
}: {
  workbook: WorkbookData | undefined
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  return (
    <div>
      <label className="block text-[11px] text-slate-500">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
      >
        <option value="">— 未設定 —</option>
        {workbook?.sheets.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function ColumnSelect({
  workbook,
  sheet,
  value,
  onChange,
  label,
}: {
  workbook: WorkbookData
  sheet: string | undefined
  value: string | undefined
  onChange: (v: string | undefined) => void
  label: string
}) {
  const s = workbook.sheets.find((x) => x.name === sheet)
  const opts = useMemo(() => {
    if (!s) return [] as { letter: string; label: string }[]
    const maxCols = Math.max(s.headers.length, 6)
    return Array.from({ length: maxCols }).map((_, i) => {
      const letter = colIndexToLetter(i)
      const h = s.headers[i]?.toString().trim()
      return { letter, label: h ? `${letter}: ${h}` : letter }
    })
  }, [s])
  return (
    <div>
      <label className="block text-[11px] text-slate-500">{label}</label>
      <select
        disabled={!sheet}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">— 未設定 —</option>
        {opts.map((o) => (
          <option key={o.letter} value={o.letter}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function CellInput({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  return (
    <input
      type="text"
      placeholder="例: B2"
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value.trim().toUpperCase() || undefined)
      }
      className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs outline-none focus:border-indigo-400"
    />
  )
}

function SourceFields({
  workbook,
  value,
  onChange,
}: {
  workbook: WorkbookData
  value: { sheet: string; column: string } | undefined
  onChange: (v: { sheet: string; column: string } | undefined) => void
}) {
  return (
    <fieldset className="rounded border border-slate-100 p-2">
      <legend className="px-1 text-[10px] uppercase text-slate-500">選択肢ソース</legend>
      <div className="space-y-1.5">
        <SheetSelect
          workbook={workbook}
          label="シート"
          value={value?.sheet}
          onChange={(v) => {
            if (!v) onChange(undefined)
            else onChange({ sheet: v, column: value?.column ?? '' })
          }}
        />
        <ColumnSelect
          workbook={workbook}
          sheet={value?.sheet}
          value={value?.column}
          label="列"
          onChange={(v) => {
            if (!value?.sheet) return
            if (!v) onChange(undefined)
            else onChange({ sheet: value.sheet, column: v })
          }}
        />
      </div>
    </fieldset>
  )
}

function InitFromFields({
  workbook,
  value,
  onChange,
}: {
  workbook: WorkbookData
  value: { sheet: string; cell: string } | undefined
  onChange: (v: { sheet: string; cell: string } | undefined) => void
}) {
  return (
    <fieldset className="rounded border border-slate-100 p-2">
      <legend className="px-1 text-[10px] uppercase text-slate-500">初期値（読込）</legend>
      <div className="space-y-1.5">
        <SheetSelect
          workbook={workbook}
          label="シート"
          value={value?.sheet}
          onChange={(v) => {
            if (!v) onChange(undefined)
            else onChange({ sheet: v, cell: value?.cell ?? '' })
          }}
        />
        <div>
          <label className="block text-[11px] text-slate-500">セル</label>
          <CellInput
            value={value?.cell}
            onChange={(v) => {
              if (!value?.sheet) return
              if (!v) onChange(undefined)
              else onChange({ sheet: value.sheet, cell: v })
            }}
          />
        </div>
      </div>
    </fieldset>
  )
}

function WriteToFields({
  workbook,
  value,
  onChange,
}: {
  workbook: WorkbookData
  value: { sheet: string; column: string } | undefined
  onChange: (v: { sheet: string; column: string } | undefined) => void
}) {
  return (
    <fieldset className="rounded border border-slate-100 p-2">
      <legend className="px-1 text-[10px] uppercase text-slate-500">書込先（Submit時）</legend>
      <div className="space-y-1.5">
        <SheetSelect
          workbook={workbook}
          label="シート"
          value={value?.sheet}
          onChange={(v) => {
            if (!v) onChange(undefined)
            else onChange({ sheet: v, column: value?.column ?? '' })
          }}
        />
        <ColumnSelect
          workbook={workbook}
          sheet={value?.sheet}
          value={value?.column}
          label="列"
          onChange={(v) => {
            if (!value?.sheet) return
            if (!v) onChange(undefined)
            else onChange({ sheet: value.sheet, column: v })
          }}
        />
      </div>
    </fieldset>
  )
}
