import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Play, FileWarning, MessageSquare, FileSpreadsheet } from 'lucide-react'
import { useProjectStore, selectActiveForm } from '../store/project'
import { ControlView } from './ControlView'
import {
  controlFromBase,
  makeContext,
  runEvent,
  type ControlState,
  type ExecContext,
  type SideEffect,
} from '../lib/vba-runtime'
import type { ControlBase, UserForm } from '../types/project'

type MsgBoxItem = { id: number; message: string; title?: string }

export function PreviewModal({ onClose }: { onClose: () => void }) {
  const form = useProjectStore(selectActiveForm)
  const workbook = useProjectStore((s) => s.project.workbook)

  const ctxRef = useRef<ExecContext | null>(null)
  const [states, setStates] = useState<Map<string, ControlState>>(new Map())
  const [msgboxes, setMsgboxes] = useState<MsgBoxItem[]>([])
  const [writes, setWrites] = useState<{ sheet: string; cell: string; value: string }[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const msgIdRef = useRef(0)

  const applyEffects = (effects: SideEffect[]) => {
    for (const ef of effects) {
      if (ef.kind === 'msgbox') {
        const id = ++msgIdRef.current
        setMsgboxes((m) => [...m, { id, message: ef.message, title: ef.title }])
      } else if (ef.kind === 'write') {
        setWrites((w) => [...w, { sheet: ef.sheet, cell: ef.cell, value: ef.value }])
      } else if (ef.kind === 'log') {
        setLogs((l) => [...l, ef.message])
      } else if (ef.kind === 'unload') {
        setLogs((l) => [...l, 'Unload Me — フォームが閉じられました'])
      }
    }
  }

  // Build context + run Initialize on mount
  useEffect(() => {
    if (!form) return
    let cancelled = false
    try {
      const ctx = makeContext(form.code, form, workbook, (id) => {
        setStates((prev) => {
          const next = new Map(prev)
          const cs = ctx.controlStates.get(id)
          if (cs) next.set(id, { ...cs })
          return next
        })
      })
      ctxRef.current = ctx
      const res = runEvent(ctx, 'UserForm_Initialize')
      // Defer state seeding into a microtask so we don't cascade renders inside this effect.
      queueMicrotask(() => {
        if (cancelled) return
        applyEffects(res.effects)
        setStates(new Map(ctx.controlStates))
        setError(null)
      })
    } catch (e) {
      queueMicrotask(() => {
        if (!cancelled) setError((e as Error).message)
      })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onButtonClick = (controlName: string) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const res = runEvent(ctx, `${controlName}_Click`)
    applyEffects(res.effects)
    setStates(new Map(ctx.controlStates))
    if (res.unloaded) {
      setTimeout(onClose, 400)
    }
  }

  const onControlInput = (controlName: string, value: string | boolean) => {
    const ctx = ctxRef.current
    if (!ctx || !form) return
    const cs = [...ctx.controlStates.values()].find((s) => s.name === controlName)
    if (!cs) return
    if (typeof value === 'string') {
      cs.text = value
      cs.value = value
    } else {
      cs.value = value
    }
    setStates(new Map(ctx.controlStates))
    // Trigger Change event
    const res = runEvent(ctx, `${controlName}_Change`)
    applyEffects(res.effects)
    setStates(new Map(ctx.controlStates))
  }

  if (!form) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">プレビュー (VBA インタプリタ)</h2>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
              MVP — 完全互換ではありません
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Form canvas */}
          <div className="flex flex-1 items-start justify-center overflow-auto bg-slate-200 pt-10 pb-8">
            <PreviewForm
              form={form}
              states={states}
              onButtonClick={onButtonClick}
              onControlInput={onControlInput}
            />
          </div>

          {/* Side panel: events, writes, msgs */}
          <aside className="w-80 overflow-auto border-l border-slate-200 bg-white">
            {error && (
              <div className="m-2 flex items-start gap-1 rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                <FileWarning className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">パースエラー</div>
                  <div className="font-mono">{error}</div>
                </div>
              </div>
            )}

            <Section title="MsgBox" icon={<MessageSquare className="h-3.5 w-3.5" />}>
              {msgboxes.length === 0 ? (
                <Empty>表示されたメッセージはまだありません</Empty>
              ) : (
                <ul className="space-y-1">
                  {msgboxes.map((m) => (
                    <li
                      key={m.id}
                      className="rounded border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      {m.title && (
                        <div className="mb-0.5 text-[10px] font-semibold text-slate-500">
                          {m.title}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap font-mono text-[11px]">
                        {m.message}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="ワークシート書込ログ"
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            >
              {writes.length === 0 ? (
                <Empty>書込はまだ発生していません</Empty>
              ) : (
                <ul className="space-y-0.5 font-mono text-[11px]">
                  {writes.map((w, i) => (
                    <li key={i} className="rounded bg-emerald-50 px-1.5 py-0.5">
                      <span className="text-emerald-700">{w.sheet}!{w.cell}</span>
                      <span className="text-slate-500"> ← </span>
                      <span className="text-slate-700">{w.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="ログ">
              {logs.length === 0 ? (
                <Empty>—</Empty>
              ) : (
                <ul className="space-y-0.5 font-mono text-[10px] text-slate-500">
                  {logs.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-[10px] text-slate-500">
          ボタンクリックで _Click ハンドラが、テキスト入力で _Change ハンドラが実行されます。
          ワークシート書込はログに表示されるのみで実Excelは操作しません。
        </footer>
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-400">{children}</p>
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-100 p-2">
      <h3 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}

function PreviewForm({
  form,
  states,
  onButtonClick,
  onControlInput,
}: {
  form: UserForm
  states: Map<string, ControlState>
  onButtonClick: (name: string) => void
  onControlInput: (name: string, value: string | boolean) => void
}) {
  return (
    <div
      style={{
        width: form.width,
        minHeight: form.height,
        background: form.backColor,
        position: 'relative',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        border: '1px solid #555',
      }}
    >
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
        }}
      >
        <span>{form.caption}</span>
        <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>− □ ×</span>
      </div>
      {form.controls.map((c) => (
        <PreviewControl
          key={c.id}
          control={c}
          state={states.get(c.id)}
          onClick={() => onButtonClick(c.name)}
          onInput={(v) => onControlInput(c.name, v)}
        />
      ))}
    </div>
  )
}

function PreviewControl({
  control,
  state,
  onClick,
  onInput,
}: {
  control: ControlBase
  state: ControlState | undefined
  onClick: () => void
  onInput: (v: string | boolean) => void
}) {
  const s = state ?? controlFromBase(control)
  const wrap = useMemo(
    () => ({
      position: 'absolute' as const,
      left: control.left,
      top: control.top,
      width: control.width,
      height: control.height,
      opacity: s.visible ? 1 : 0.3,
      pointerEvents: s.enabled ? ('auto' as const) : ('none' as const),
    }),
    [control, s.visible, s.enabled],
  )

  // Make a live-mirroring control by overriding rendered props
  const liveControl: ControlBase = {
    ...control,
    text: s.text,
    caption: control.type === 'CommandButton' || control.type === 'Label' || control.type === 'Frame' || control.type === 'CheckBox' || control.type === 'OptionButton' || control.type === 'ToggleButton' ? (control.caption ?? '') : control.caption,
    value: s.value,
    listItems: s.list,
  }

  if (control.type === 'CommandButton') {
    return (
      <button
        style={wrap}
        onClick={onClick}
        className="cursor-pointer"
        title={`${control.name}_Click を実行`}
      >
        <ControlView control={liveControl} />
      </button>
    )
  }
  if (control.type === 'TextBox') {
    return (
      <div style={wrap}>
        <input
          value={s.text}
          onChange={(e) => onInput(e.target.value)}
          className="h-full w-full border border-slate-400 bg-white px-1 text-xs outline-none focus:border-indigo-500"
        />
      </div>
    )
  }
  if (control.type === 'CheckBox') {
    return (
      <label style={{ ...wrap, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={Boolean(s.value)}
          onChange={(e) => onInput(e.target.checked)}
        />
        <span style={{ fontSize: 11 }}>{control.caption}</span>
      </label>
    )
  }
  if (control.type === 'ComboBox') {
    return (
      <div style={wrap}>
        <select
          value={String(s.value)}
          onChange={(e) => onInput(e.target.value)}
          className="h-full w-full border border-slate-400 bg-white px-1 text-xs outline-none focus:border-indigo-500"
        >
          <option value="">—</option>
          {s.list.map((it, i) => (
            <option key={i} value={it}>
              {it}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (control.type === 'ListBox') {
    return (
      <div style={wrap}>
        <select
          size={Math.max(2, Math.floor(control.height / 14))}
          value={String(s.value)}
          onChange={(e) => onInput(e.target.value)}
          className="h-full w-full border border-slate-400 bg-white text-xs outline-none focus:border-indigo-500"
        >
          {s.list.map((it, i) => (
            <option key={i} value={it}>
              {it}
            </option>
          ))}
        </select>
      </div>
    )
  }
  return (
    <div style={wrap}>
      <ControlView control={liveControl} />
    </div>
  )
}
