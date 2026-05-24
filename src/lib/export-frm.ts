/**
 * Generate a .frm (text) and .frx (binary placeholder) for a UserForm.
 *
 * The .frm format used here mirrors what VBE produces when you File > Export:
 *   VERSION 5.00
 *   Begin {GUID} UserForm1
 *      Caption         = "..."
 *      ClientWidth     =   <twips>
 *      ...
 *      Begin Forms.CommandButton CommandButton1
 *         Caption       = "..."
 *         Height        = <twips>
 *         ...
 *      End
 *   End
 *   Attribute VB_Name = "UserForm1"
 *   <code>
 *
 * NOTE: The .frx file VBE produces contains a binary OleObjectBlob describing
 * runtime form state. Generating a fully-valid .frx requires emitting the
 * MS-OFORMS persistence stream which is non-trivial. For maximum compatibility
 * we omit `OleObjectBlob =` from the .frm header — VBE will recreate the
 * binary on first save. We still emit a tiny placeholder .frx so users get
 * the expected file pair.
 */
import type { ControlBase, ControlType, UserForm } from '../types/project'
import {
  escapeVbaString,
  hexToOleColor,
  indent as indentLines,
  pxToTwips,
  vbaBool,
} from './vba-format'

/** ProgID of each control as it appears in the .frm "Begin Forms.X" line. */
const CONTROL_PROG_ID: Record<ControlType, string> = {
  Label: 'Forms.Label.1',
  TextBox: 'Forms.TextBox.1',
  CommandButton: 'Forms.CommandButton.1',
  ComboBox: 'Forms.ComboBox.1',
  ListBox: 'Forms.ListBox.1',
  CheckBox: 'Forms.CheckBox.1',
  OptionButton: 'Forms.OptionButton.1',
  ToggleButton: 'Forms.ToggleButton.1',
  Frame: 'Forms.Frame.1',
  Image: 'Forms.Image.1',
  MultiPage: 'Forms.MultiPage.1',
  TabStrip: 'Forms.TabStrip.1',
  ScrollBar: 'Forms.ScrollBar.1',
  SpinButton: 'Forms.SpinButton.1',
}

/** UserForm GUID — Microsoft Forms 2.0 UserForm. */
const USERFORM_GUID = '{C62A69F0-16DC-11CE-9E98-00AA00574A4F}'

function controlBody(c: ControlBase, depth: number): string {
  const lines: string[] = []
  const push = (k: string, v: string) => lines.push(`${k.padEnd(15)} =   ${v}`)

  if (c.caption !== undefined && hasCaption(c.type))
    push('Caption', escapeVbaString(String(c.caption)))
  if (c.text !== undefined && (c.type === 'TextBox' || c.type === 'ComboBox'))
    push('Text', escapeVbaString(String(c.text)))
  if (c.value !== undefined && hasValue(c.type)) {
    if (typeof c.value === 'boolean') {
      push('Value', c.value ? '"1"' : '"0"')
    } else {
      push('Value', escapeVbaString(String(c.value)))
    }
  }

  push('Height', String(pxToTwips(c.height)))
  push('Left', String(pxToTwips(c.left)))
  push('Top', String(pxToTwips(c.top)))
  push('Width', String(pxToTwips(c.width)))

  if (c.tabIndex !== undefined) push('TabIndex', String(c.tabIndex))
  if (c.enabled === false) push('Enabled', vbaBool(false))
  if (c.visible === false) push('Visible', vbaBool(false))
  if (c.tabStop === false) push('TabStop', vbaBool(false))
  if (c.controlTipText) push('ControlTipText', escapeVbaString(c.controlTipText))

  if (c.backColor && c.backColor !== 'transparent')
    push('BackColor', hexToOleColor(c.backColor))
  if (c.foreColor) push('ForeColor', hexToOleColor(c.foreColor))
  if (c.borderColor) push('BorderColor', hexToOleColor(c.borderColor))
  if (c.borderStyle === 'single') push('BorderStyle', '1  \'fmBorderStyleSingle')

  // Font block (FontProperties_M not emitted; users edit fonts in VBE)
  if (c.fontName || c.fontSize) {
    push(
      'BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851}',
      ''
    )
    lines.push(indentLines(depth + 1, `Name            =   ${escapeVbaString(c.fontName ?? 'MS UI Gothic')}`))
    if (c.fontSize) lines.push(indentLines(depth + 1, `Size            =   ${c.fontSize}`))
    if (c.fontBold) lines.push(indentLines(depth + 1, `Weight          =   700`))
    if (c.fontItalic) lines.push(indentLines(depth + 1, `Italic          =   -1  'True`))
    if (c.fontUnderline) lines.push(indentLines(depth + 1, `Underline       =   -1  'True`))
    lines.push(indentLines(depth, 'EndProperty'))
  }

  if (c.multiLine && c.type === 'TextBox')
    push('MultiLine', '-1  \'True')
  if (c.maxLength && c.type === 'TextBox')
    push('MaxLength', String(c.maxLength))
  if (c.passwordChar && c.type === 'TextBox')
    push('PasswordChar', escapeVbaString(c.passwordChar))

  if (c.groupName && (c.type === 'CheckBox' || c.type === 'OptionButton'))
    push('GroupName', escapeVbaString(c.groupName))

  return lines.map((l) => indentLines(depth, l)).join('\r\n')
}

function hasCaption(t: ControlType): boolean {
  return ['Label', 'CommandButton', 'CheckBox', 'OptionButton', 'ToggleButton', 'Frame'].includes(t)
}
function hasValue(t: ControlType): boolean {
  return ['CheckBox', 'OptionButton', 'ToggleButton'].includes(t)
}

function controlBlock(c: ControlBase, depth: number): string {
  const head = indentLines(depth, `Begin ${CONTROL_PROG_ID[c.type]} ${c.name}`)
  const body = controlBody(c, depth + 1)
  const tail = indentLines(depth, 'End')
  return [head, body, tail].join('\r\n')
}

export function buildFrm(form: UserForm): string {
  const lines: string[] = []
  lines.push('VERSION 5.00')
  lines.push(`Begin ${USERFORM_GUID} ${form.name}`)
  lines.push(indentLines(1, `Caption         =   ${escapeVbaString(form.caption)}`))
  lines.push(indentLines(1, `ClientHeight    =   ${pxToTwips(form.height)}`))
  lines.push(indentLines(1, `ClientLeft      =   120`))
  lines.push(indentLines(1, `ClientTop       =   465`))
  lines.push(indentLines(1, `ClientWidth     =   ${pxToTwips(form.width)}`))
  lines.push(indentLines(1, `StartUpPosition =   1  'CenterOwner`))
  if (form.backColor && form.backColor !== 'transparent') {
    lines.push(indentLines(1, `BackColor       =   ${hexToOleColor(form.backColor)}`))
  }

  for (const c of form.controls) {
    lines.push(controlBlock(c, 1))
  }
  lines.push('End')

  // Attribute block
  lines.push(`Attribute VB_Name = ${escapeVbaString(form.name)}`)
  lines.push('Attribute VB_GlobalNameSpace = False')
  lines.push('Attribute VB_Creatable = False')
  lines.push('Attribute VB_PredeclaredId = True')
  lines.push('Attribute VB_Exposed = False')

  // Code-behind
  const code = (form.code ?? '').replace(/\r?\n/g, '\r\n')
  lines.push(code.endsWith('\r\n') ? code.slice(0, -2) : code)

  return lines.join('\r\n') + '\r\n'
}

/**
 * Generate a placeholder .frx (8 zero bytes). VBE may regenerate the binary on
 * first save; for forms with no embedded pictures this is generally accepted.
 */
export function buildFrx(): ArrayBuffer {
  return new ArrayBuffer(8)
}
