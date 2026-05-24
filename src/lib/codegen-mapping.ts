/**
 * Generate VBA code for worksheet ↔ UserForm mapping.
 *
 * Generated code is wrapped between marker comments so the user can edit code
 * elsewhere in the module without losing their changes when we regenerate:
 *
 *   ' === AUTO-GENERATED: MAPPING ===  (DO NOT EDIT BETWEEN THESE MARKERS)
 *   ...generated subs...
 *   ' === END AUTO-GENERATED ===
 */
import type { ControlBase, ControlType, UserForm } from '../types/project'

export const MARK_BEGIN = "' === AUTO-GENERATED: MAPPING ===  (DO NOT EDIT BETWEEN THESE MARKERS)"
export const MARK_END = "' === END AUTO-GENERATED ==="

const IS_TEXTUAL: ControlType[] = ['TextBox', 'ComboBox']
const IS_BOOLEAN: ControlType[] = ['CheckBox', 'OptionButton', 'ToggleButton']

function quoteSheet(name: string): string {
  // VBA literal: Worksheets("Sheet 1")
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Build the generated VBA block from the form's mapping.
 * Returns "" when no mapping data is present.
 */
export function buildMappingCode(form: UserForm): string {
  const mapping = form.mapping
  if (!mapping) return ''
  const controlById = new Map(form.controls.map((c) => [c.id, c] as const))

  const lines: string[] = []
  lines.push(MARK_BEGIN)

  // ---- UserForm_Initialize ----
  const initBody: string[] = []

  for (const [ctrlId, m] of Object.entries(mapping.controls)) {
    const c = controlById.get(ctrlId)
    if (!c) continue

    if (m.source && (c.type === 'ComboBox' || c.type === 'ListBox')) {
      initBody.push(...initComboList(c, m.source.sheet, m.source.column))
      initBody.push('')
    }

    if (m.initFrom) {
      initBody.push(...initFromCell(c, m.initFrom.sheet, m.initFrom.cell))
    }
  }

  if (initBody.length > 0) {
    lines.push('Private Sub UserForm_Initialize()')
    lines.push('    Dim ws As Worksheet')
    lines.push('    Dim i As Long, lastRow As Long')
    lines.push('')
    for (const l of initBody) lines.push(l ? '    ' + l : '')
    lines.push('End Sub')
    lines.push('')
  }

  // ---- Submit click ----
  const submitName = mapping.submitButtonName
  const targetSheet = mapping.targetSheet
  if (submitName && targetSheet) {
    lines.push(`Private Sub ${submitName}_Click()`)
    lines.push('    Dim ws As Worksheet')
    lines.push('    Dim newRow As Long')
    lines.push(`    Set ws = ThisWorkbook.Worksheets(${quoteSheet(targetSheet)})`)
    lines.push('    newRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row + 1')
    lines.push('    If newRow < 2 Then newRow = 2')
    lines.push('')
    for (const [ctrlId, m] of Object.entries(mapping.controls)) {
      const c = controlById.get(ctrlId)
      if (!c || !m.writeToColumn) continue
      const colExpr = `ws.Cells(newRow, "${m.writeToColumn.column}")`
      if (IS_BOOLEAN.includes(c.type)) {
        lines.push(`    ${colExpr}.Value = Me.${c.name}.Value`)
      } else if (IS_TEXTUAL.includes(c.type)) {
        lines.push(`    ${colExpr}.Value = Me.${c.name}.${c.type === 'ComboBox' ? 'Value' : 'Text'}`)
      } else {
        lines.push(`    ${colExpr}.Value = Me.${c.name}.Value`)
      }
    }
    lines.push('')
    lines.push('    MsgBox "登録しました", vbInformation')
    lines.push('    Unload Me')
    lines.push('End Sub')
    lines.push('')
  }

  lines.push(MARK_END)
  return lines.join('\r\n') + '\r\n'
}

function initComboList(c: ControlBase, sheet: string, column: string): string[] {
  return [
    `' Populate ${c.name} from ${sheet}!${column}`,
    `Set ws = ThisWorkbook.Worksheets(${quoteSheet(sheet)})`,
    `lastRow = ws.Cells(ws.Rows.Count, "${column}").End(xlUp).Row`,
    `Me.${c.name}.Clear`,
    `For i = 2 To lastRow`,
    `    If Len(ws.Cells(i, "${column}").Value) > 0 Then Me.${c.name}.AddItem ws.Cells(i, "${column}").Value`,
    `Next i`,
  ]
}

function initFromCell(c: ControlBase, sheet: string, cell: string): string[] {
  const wsLine = `Set ws = ThisWorkbook.Worksheets(${quoteSheet(sheet)})`
  if (IS_BOOLEAN.includes(c.type)) {
    return [
      `' Initial value for ${c.name} from ${sheet}!${cell}`,
      wsLine,
      `Me.${c.name}.Value = CBool(ws.Range("${cell}").Value)`,
    ]
  }
  if (c.type === 'ComboBox') {
    return [
      `' Initial value for ${c.name} from ${sheet}!${cell}`,
      wsLine,
      `Me.${c.name}.Value = ws.Range("${cell}").Value`,
    ]
  }
  return [
    `' Initial value for ${c.name} from ${sheet}!${cell}`,
    wsLine,
    `Me.${c.name}.Text = ws.Range("${cell}").Value`,
  ]
}

/**
 * Merge the new generated block into existing code:
 *   - if markers exist, replace between them
 *   - otherwise, append a fresh block (or no-op if empty)
 */
export function mergeMappingCode(existingCode: string, newBlock: string): string {
  const startIdx = existingCode.indexOf(MARK_BEGIN)
  const endIdx = existingCode.indexOf(MARK_END)

  if (startIdx >= 0 && endIdx >= 0 && endIdx > startIdx) {
    const before = existingCode.slice(0, startIdx)
    const after = existingCode.slice(endIdx + MARK_END.length)
    const trailing = after.replace(/^[\r\n]+/, '\r\n')
    if (!newBlock) {
      return (before.replace(/[\r\n]+$/, '') + (trailing.startsWith('\r\n') ? trailing : '\r\n' + trailing)).replace(/\r\n{3,}/g, '\r\n\r\n')
    }
    return before + newBlock + trailing
  }

  if (!newBlock) return existingCode
  const sep = existingCode.endsWith('\r\n\r\n')
    ? ''
    : existingCode.endsWith('\r\n')
      ? '\r\n'
      : '\r\n\r\n'
  return existingCode + sep + newBlock
}
