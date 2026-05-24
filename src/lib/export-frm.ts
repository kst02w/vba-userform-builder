/**
 * Generate a .frm (text) and .frx (binary) for a UserForm.
 *
 * The .frm format mirrors what VBE produces when you File > Export:
 *   VERSION 5.00
 *   Begin {GUID} UserForm1
 *      Caption         =   "..."
 *      ClientWidth     =   <twips>
 *      OleObjectBlob   =   "UserForm1.frx":0000
 *      ...
 *      Begin Forms.CommandButton CommandButton1
 *         Caption       =   "..."
 *         Height        =   <twips>
 *         ...
 *      End
 *   End
 *   Attribute VB_Name = "UserForm1"
 *   <code>
 *
 * .FRX FORMAT:
 *   VBE requires OleObjectBlob in the .frm header pointing to a .frx companion
 *   file. Without it VBE treats the .frm as a Standard Module and all controls
 *   fail to load. The .frx is an OLE Compound Binary File (CFBF) wrapped in a
 *   24-byte proprietary header. buildFrx() uses RealForm.frx (an empty UserForm
 *   exported from a real VBE session) as a binary template, patching only the
 *   form dimensions in the "f" persistence stream.
 *
 * ENCODING: VBE on Windows reads .frm files with the system ANSI codepage
 * (CP932/Shift-JIS on Japanese Windows). buildFrmBytes() encodes the output
 * to CP932 so that Japanese captions import correctly.
 */
import Encoding from 'encoding-japanese'
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
    // VBE stores CheckBox/OptionButton/ToggleButton Value as an integer, NOT a quoted string.
    // True = -1, False = 0  (VBA Boolean convention)
    if (typeof c.value === 'boolean') {
      push('Value', vbaBool(c.value))
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

  // Font block — BeginProperty syntax: NO '=' on the Begin line.
  // Sub-properties are at depth+1 relative to the current block.
  // We push raw strings here; the final lines.map(l => indentLines(depth, l))
  // at the end of this function adds the correct base indentation.
  // Sub-property lines use indentLines(1, ...) so they end up at depth+1.
  if (c.fontName || c.fontSize) {
    const fname = c.fontName ?? 'MS UI Gothic'
    const fsize = c.fontSize ?? 9
    // Japanese fonts need charset 128 (Shift-JIS); Latin fonts use 0 (ANSI)
    const charset = /gothic|mincho|meiryo|yu|ms p/i.test(fname) ? 128 : 0
    const weight = c.fontBold ? 700 : 400
    lines.push(`BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851}`)
    lines.push(indentLines(1, `Name            =   ${escapeVbaString(fname)}`))
    lines.push(indentLines(1, `Size            =   ${fsize}`))
    lines.push(indentLines(1, `Charset         =   ${charset}`))
    lines.push(indentLines(1, `Weight          =   ${weight}`))
    lines.push(indentLines(1, `Underline       =   ${c.fontUnderline ? "-1  'True" : "0   'False"}`))
    lines.push(indentLines(1, `Italic          =   ${c.fontItalic ? "-1  'True" : "0   'False"}`))
    lines.push(indentLines(1, `Strikethrough   =   0   'False`))
    lines.push(`EndProperty`)
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
  // OleObjectBlob is REQUIRED: without it VBE imports the file as a Standard
  // Module instead of a UserForm, causing all Begin/End control blocks to fail.
  lines.push(indentLines(1, `OleObjectBlob   =   "${form.name}.frx":0000`))
  lines.push(indentLines(1, `StartUpPosition =   1  'CenterOwner`))
  // NOTE: BackColor / ForeColor / Font for the form itself are stored in the
  // .frx binary (OleObjectBlob), NOT in the .frm text header. Writing BackColor
  // here causes VBE to log "プロパティ名 BackColor が不正です" and skip loading
  // all controls. Background color can be changed in VBE's Properties window.

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
 * Encode a .frm string as CP932 (Shift-JIS) bytes.
 * VBE on Japanese Windows reads .frm files in the system ANSI codepage (CP932).
 * Using this instead of a raw UTF-8 Blob ensures Japanese captions import correctly.
 */
export function buildFrmBytes(form: UserForm): Uint8Array<ArrayBuffer> {
  const text = buildFrm(form)
  const codes = Encoding.stringToCode(text)
  const sjis = Encoding.convert(codes, { to: 'SJIS', type: 'array' }) as number[]
  const buf = new ArrayBuffer(sjis.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < sjis.length; i++) view[i] = sjis[i]
  return view
}

// ─── .frx binary generation ──────────────────────────────────────────────────
// RealForm.frx: empty UserForm exported from real VBE (2584 bytes).
// Structure: 24-byte "LB" proprietary header + 2560-byte CFBF document.
// CFBF streams: "f" (FormControl, 38 bytes), "o" (empty), "CompObj" (110 bytes).
// We patch bytes 2084–2091 (Width/Height in HiMetrics inside the "f" stream).
const FRX_TEMPLATE_B64 =
  'TEIIAAAKAAAAAAAAAAAAAMASAAAQDgAA0M8R4KGxGuEAAAAAAAAAAAAAAAAAAAAAPgADAP7/CQAG' +
  'AAAAAAAAAAAAAAABAAAAAQAAAAAAAAAAEAAAAgAAAAEAAAD+////AAAAAAAAAAD/////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '///////////////////////////////9/////v////7////+////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '/////////////////////////////1IAbwBvAHQAIABFAG4AdAByAHkAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAAUA//////////8CAAAA8GkqxtwWzhGemACq' +
  'AFdKTwAAAAAAAAAAAAAAAJBjd+9n69wBAwAAAMAAAAAAAAAAZgAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAgD/////////////' +
  '//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJgAAAAAAAABvAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'BAACAQEAAAADAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7///8A' +
  'AAAAAAAAAAEAQwBvAG0AcABPAGIAagAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAASAAIA////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAQAAAG4AAAAAAAAA/v///wIAAAD+////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '////////////////////////////////////////////////////////////////////////////' +
  '//////////////////////////8ABBgAAAwACAB9AABrHwAAxhQAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQD+/wMKAAD/////8GkqxtwWzhGemACqAFdKTxkA' +
  'AABNaWNyb3NvZnQgRm9ybXMgMi4wIEZvcm0AEAAAAEVtYmVkZGVkIE9iamVjdAANAAAARm9ybXMu' +
  'Rm9ybS4xAPQ5snEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAA=='

/** Write UInt32 little-endian. */
function writeUint32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff
  buf[offset + 1] = (value >>> 8) & 0xff
  buf[offset + 2] = (value >>> 16) & 0xff
  buf[offset + 3] = (value >>> 24) & 0xff
}

/** px (96 DPI) → HiMetric (1/100 mm). */
function pxToHimetric(px: number): number {
  return Math.floor(Math.round(px * 15) * 2540 / 1440)
}

/**
 * Generate the .frx binary companion for a UserForm.
 * Uses RealForm.frx as a template, patching the form dimensions in the "f"
 * persistence stream. Controls defined via Begin/End blocks in the .frm
 * do not need SITE records in .frx — VBE reads them directly from the text.
 */
export function buildFrx(form: UserForm): Uint8Array<ArrayBuffer> {
  const raw = atob(FRX_TEMPLATE_B64.replace(/\s/g, ''))
  const buf = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  // Patch Width/Height in "f" stream (mini sector 0, file offset 2072).
  // Property offsets within "f": Width=12, Height=16 → file offsets 2084, 2088.
  writeUint32LE(bytes, 2084, pxToHimetric(form.width))
  writeUint32LE(bytes, 2088, pxToHimetric(form.height))
  return bytes as Uint8Array<ArrayBuffer>
}
