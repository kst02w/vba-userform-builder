import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  useProjectStore,
  selectActiveControl,
  selectActiveForm,
} from '../store/project'
import type { ControlBase, UserForm } from '../types/project'
import { cn } from '../lib/utils'
import { MappingFields } from './MappingFields'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 py-0.5">
      <label className="truncate text-[11px] text-slate-500">{label}</label>
      <div>{children}</div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  type = 'text',
}: {
  value: string | number | undefined
  onChange: (v: string) => void
  type?: 'text' | 'number'
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
    />
  )
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(e) => {
        const n = Number(e.target.value)
        if (!Number.isNaN(n)) onChange(n)
      }}
      min={min}
      max={max}
      step={step}
      className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
    />
  )
}

function ColorInput({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (v: string) => void
}) {
  const v = value && value !== 'transparent' ? value : '#000000'
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-7 cursor-pointer rounded border border-slate-200 p-0"
      />
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="transparent"
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-xs outline-none focus:border-indigo-400"
      />
    </div>
  )
}

function BoolInput({
  value,
  onChange,
}: {
  value: boolean | undefined
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5"
      />
    </label>
  )
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900',
        )}
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {title}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

function ControlProperties({
  form,
  control,
}: {
  form: UserForm
  control: ControlBase
}) {
  const updateControl = useProjectStore((s) => s.updateControl)
  const u = (patch: Partial<ControlBase>) =>
    updateControl(form.id, control.id, patch)

  const hasCaption =
    control.type === 'Label' ||
    control.type === 'CommandButton' ||
    control.type === 'ToggleButton' ||
    control.type === 'CheckBox' ||
    control.type === 'OptionButton' ||
    control.type === 'Frame'
  const hasText = control.type === 'TextBox' || control.type === 'ComboBox'
  const hasList = control.type === 'ComboBox' || control.type === 'ListBox'
  const hasValue =
    control.type === 'CheckBox' ||
    control.type === 'OptionButton' ||
    control.type === 'ToggleButton'

  return (
    <div className="p-3">
      <h2 className="mb-1 text-xs font-semibold text-slate-700">
        {control.name}{' '}
        <span className="text-slate-400">({control.type})</span>
      </h2>

      <Section title="識別">
        <Field label="Name">
          <TextInput value={control.name} onChange={(v) => u({ name: v })} />
        </Field>
      </Section>

      <Section title="位置・サイズ">
        <Field label="Left">
          <NumberInput
            value={control.left}
            onChange={(v) => u({ left: v })}
          />
        </Field>
        <Field label="Top">
          <NumberInput value={control.top} onChange={(v) => u({ top: v })} />
        </Field>
        <Field label="Width">
          <NumberInput
            value={control.width}
            onChange={(v) => u({ width: v })}
            min={8}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            value={control.height}
            onChange={(v) => u({ height: v })}
            min={8}
          />
        </Field>
      </Section>

      <Section title="表示">
        {hasCaption && (
          <Field label="Caption">
            <TextInput
              value={control.caption}
              onChange={(v) => u({ caption: v })}
            />
          </Field>
        )}
        {hasText && (
          <Field label="Text">
            <TextInput
              value={control.text as string}
              onChange={(v) => u({ text: v })}
            />
          </Field>
        )}
        {hasValue && (
          <Field label="Value">
            <BoolInput
              value={control.value as boolean}
              onChange={(v) => u({ value: v })}
            />
          </Field>
        )}
        {hasList && (
          <Field label="Items">
            <textarea
              value={(control.listItems as string[])?.join('\n') ?? ''}
              onChange={(e) =>
                u({
                  listItems: e.target.value
                    .split('\n')
                    .filter((x) => x.length > 0),
                })
              }
              rows={3}
              placeholder="1行ごとに項目"
              className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
            />
          </Field>
        )}
        <Field label="ForeColor">
          <ColorInput
            value={control.foreColor}
            onChange={(v) => u({ foreColor: v })}
          />
        </Field>
        <Field label="BackColor">
          <ColorInput
            value={control.backColor}
            onChange={(v) => u({ backColor: v })}
          />
        </Field>
      </Section>

      <Section title="フォント">
        <Field label="FontName">
          <TextInput
            value={control.fontName}
            onChange={(v) => u({ fontName: v })}
          />
        </Field>
        <Field label="FontSize">
          <NumberInput
            value={control.fontSize}
            onChange={(v) => u({ fontSize: v })}
            min={6}
            max={72}
          />
        </Field>
        <Field label="Bold">
          <BoolInput
            value={control.fontBold}
            onChange={(v) => u({ fontBold: v })}
          />
        </Field>
        <Field label="Italic">
          <BoolInput
            value={control.fontItalic}
            onChange={(v) => u({ fontItalic: v })}
          />
        </Field>
      </Section>

      <Section title="動作">
        <Field label="Enabled">
          <BoolInput
            value={control.enabled}
            onChange={(v) => u({ enabled: v })}
          />
        </Field>
        <Field label="Visible">
          <BoolInput
            value={control.visible}
            onChange={(v) => u({ visible: v })}
          />
        </Field>
        <Field label="TabIndex">
          <NumberInput
            value={control.tabIndex}
            onChange={(v) => u({ tabIndex: v })}
            min={0}
          />
        </Field>
        <Field label="TabStop">
          <BoolInput
            value={control.tabStop}
            onChange={(v) => u({ tabStop: v })}
          />
        </Field>
      </Section>

      <Section title="データ連携" defaultOpen={true}>
        <MappingFields form={form} control={control} />
      </Section>

      <Section title="その他" defaultOpen={false}>
        <Field label="ControlTipText">
          <TextInput
            value={control.controlTipText}
            onChange={(v) => u({ controlTipText: v })}
          />
        </Field>
        {control.type === 'TextBox' && (
          <>
            <Field label="MultiLine">
              <BoolInput
                value={control.multiLine}
                onChange={(v) => u({ multiLine: v })}
              />
            </Field>
            <Field label="MaxLength">
              <NumberInput
                value={control.maxLength}
                onChange={(v) => u({ maxLength: v })}
                min={0}
              />
            </Field>
            <Field label="PasswordChar">
              <TextInput
                value={control.passwordChar}
                onChange={(v) => u({ passwordChar: v.slice(0, 1) })}
              />
            </Field>
          </>
        )}
        <Field label="BorderStyle">
          <select
            value={control.borderStyle ?? 'none'}
            onChange={(e) =>
              u({ borderStyle: e.target.value as 'none' | 'single' })
            }
            className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-400"
          >
            <option value="none">なし</option>
            <option value="single">単線</option>
          </select>
        </Field>
        {(control.type === 'CheckBox' || control.type === 'OptionButton') && (
          <Field label="GroupName">
            <TextInput
              value={control.groupName}
              onChange={(v) => u({ groupName: v })}
            />
          </Field>
        )}
      </Section>
    </div>
  )
}

function FormProperties({ form }: { form: UserForm }) {
  const updateForm = useProjectStore((s) => s.updateForm)
  const u = (patch: Partial<UserForm>) => updateForm(form.id, patch)
  return (
    <div className="p-3">
      <h2 className="mb-1 text-xs font-semibold text-slate-700">
        {form.name} <span className="text-slate-400">(UserForm)</span>
      </h2>
      <Section title="識別">
        <Field label="Name">
          <TextInput value={form.name} onChange={(v) => u({ name: v })} />
        </Field>
        <Field label="Caption">
          <TextInput value={form.caption} onChange={(v) => u({ caption: v })} />
        </Field>
      </Section>
      <Section title="サイズ">
        <Field label="Width">
          <NumberInput
            value={form.width}
            onChange={(v) => u({ width: v })}
            min={80}
            max={1600}
          />
        </Field>
        <Field label="Height">
          <NumberInput
            value={form.height}
            onChange={(v) => u({ height: v })}
            min={60}
            max={1200}
          />
        </Field>
      </Section>
      <Section title="表示">
        <Field label="BackColor">
          <ColorInput
            value={form.backColor}
            onChange={(v) => u({ backColor: v })}
          />
        </Field>
      </Section>
      <p className="mt-3 text-[10px] text-slate-400">
        コントロールを選択するとそのプロパティが表示されます。
      </p>
    </div>
  )
}

export function PropertiesPanel() {
  const form = useProjectStore(selectActiveForm)
  const control = useProjectStore(selectActiveControl)
  if (!form) return null
  if (control) return <ControlProperties form={form} control={control} />
  return <FormProperties form={form} />
}
