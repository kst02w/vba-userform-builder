import { useState } from 'react'
import { Zap } from 'lucide-react'
import { selectActiveForm, useProjectStore } from '../store/project'
import { EVENTS_BY_TYPE, FORM_EVENTS, makeEventStub } from '../lib/vba-events'
import { cn } from '../lib/utils'

export function EventStubPanel({ formId }: { formId: string }) {
  const form = useProjectStore(selectActiveForm)
  const insert = useProjectStore((s) => s.insertFormCode)
  const [target, setTarget] = useState<string>('UserForm')

  if (!form || form.id !== formId) return null

  const owners: { key: string; label: string; ownerName: string }[] = [
    { key: 'UserForm', label: 'UserForm', ownerName: 'UserForm' },
    ...form.controls.map((c) => ({ key: c.id, label: c.name, ownerName: c.name })),
  ]

  const currentOwner = owners.find((o) => o.key === target) ?? owners[0]
  const events =
    currentOwner.key === 'UserForm'
      ? FORM_EVENTS
      : EVENTS_BY_TYPE[form.controls.find((c) => c.id === currentOwner.key)!.type]

  const isCodeContains = (ownerName: string, eventName: string): boolean =>
    new RegExp(`Private\\s+Sub\\s+${ownerName}_${eventName}\\b`, 'i').test(form.code)

  return (
    <div className="p-3 text-xs">
      <h3 className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <Zap className="h-3 w-3" /> イベント
      </h3>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="mb-2 w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-indigo-400"
      >
        {owners.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ul className="space-y-1">
        {events.map((ev) => {
          const exists = isCodeContains(currentOwner.ownerName, ev.name)
          return (
            <li key={ev.name}>
              <button
                onClick={() =>
                  insert(form.id, makeEventStub(currentOwner.ownerName, ev))
                }
                disabled={exists}
                title={ev.description}
                className={cn(
                  'flex w-full items-center justify-between rounded border border-transparent px-2 py-1 text-left text-xs hover:border-indigo-200 hover:bg-indigo-50',
                  exists && 'cursor-not-allowed text-slate-400 hover:bg-transparent hover:border-transparent',
                )}
              >
                <span className="font-mono">{ev.name}</span>
                <span className="text-[10px] text-slate-400">
                  {exists ? '挿入済' : '＋'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
