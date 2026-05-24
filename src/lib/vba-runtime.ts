/**
 * Tiny VBA runtime for previewing UserForm code.
 *
 * Scope:
 *  - Variables (untyped Variant), no real Dim type enforcement
 *  - Object model: Me, Me.{Control}, ThisWorkbook, Worksheets, Range, Cells
 *  - Builtins: MsgBox, Len, Trim, UCase, LCase, Left, Right, Mid, CStr, CInt,
 *              CLng, CDbl, CBool, Chr, Asc, IIf, IsEmpty, IsNumeric, IsNull,
 *              Now, Date, vbCrLf/vbCr/vbLf constants
 *
 * Side effects observed during preview:
 *  - Control mutations (Text, Value, List items)  → applied to ControlState
 *  - Worksheet writes                              → recorded in a log
 *  - MsgBox                                        → recorded in a log + UI hook
 *  - Unload Me                                     → flag observed by UI
 */
import type { Expr, Module, Stmt } from './vba-ast'
import { parse } from './vba-parser'
import type { ControlBase, UserForm, WorkbookData } from '../types/project'

// ---------- Values ----------
export type Val =
  | { kind: 'num'; v: number }
  | { kind: 'str'; v: string }
  | { kind: 'bool'; v: boolean }
  | { kind: 'empty' }
  | { kind: 'null' }
  | { kind: 'nothing' }
  | { kind: 'obj'; obj: VBObject }

export interface VBObject {
  name: string
  get(prop: string): Val
  set(prop: string, value: Val): void
  call(method: string, args: Val[]): Val
}

const VEMPTY: Val = { kind: 'empty' }
const VNULL: Val = { kind: 'null' }
const VNOTHING: Val = { kind: 'nothing' }
const num = (v: number): Val => ({ kind: 'num', v })
const str = (v: string): Val => ({ kind: 'str', v })
const bool = (v: boolean): Val => ({ kind: 'bool', v })

// ---------- Coercion ----------
function toNum(v: Val): number {
  if (v.kind === 'num') return v.v
  if (v.kind === 'str') {
    const n = Number(v.v)
    if (!Number.isNaN(n)) return n
    return 0
  }
  if (v.kind === 'bool') return v.v ? -1 : 0
  return 0
}
function toStr(v: Val): string {
  if (v.kind === 'str') return v.v
  if (v.kind === 'num') return String(v.v)
  if (v.kind === 'bool') return v.v ? 'True' : 'False'
  if (v.kind === 'empty' || v.kind === 'null') return ''
  if (v.kind === 'nothing') return ''
  return ''
}
function toBool(v: Val): boolean {
  if (v.kind === 'bool') return v.v
  if (v.kind === 'num') return v.v !== 0
  if (v.kind === 'str') return v.v.length > 0 && v.v.toLowerCase() !== 'false'
  return false
}
function equals(a: Val, b: Val): boolean {
  if (a.kind === 'str' || b.kind === 'str') return toStr(a) === toStr(b)
  if (a.kind === 'bool' || b.kind === 'bool') return toBool(a) === toBool(b)
  return toNum(a) === toNum(b)
}
function compare(a: Val, b: Val): number {
  if (a.kind === 'str' && b.kind === 'str')
    return a.v < b.v ? -1 : a.v > b.v ? 1 : 0
  const na = toNum(a), nb = toNum(b)
  return na < nb ? -1 : na > nb ? 1 : 0
}

// ---------- Control state ----------
export type ControlState = {
  id: string
  type: string
  name: string
  text: string
  value: string | boolean | number
  list: string[]
  enabled: boolean
  visible: boolean
}

// ---------- Side effects ----------
export type SideEffect =
  | { kind: 'msgbox'; message: string; title?: string; buttons?: number }
  | { kind: 'write'; sheet: string; cell: string; value: string }
  | { kind: 'log'; message: string }
  | { kind: 'unload' }

// ---------- Workbook mock ----------
function makeWorksheetObj(
  workbook: WorkbookData | undefined,
  sheetName: string,
  effects: SideEffect[],
): VBObject {
  const sheet = workbook?.sheets.find((s) => s.name === sheetName)

  const getCellValue = (row: number, col: number): Val => {
    if (!sheet) return VEMPTY
    if (row === 1) {
      const h = sheet.headers[col - 1]
      return h !== undefined && h !== '' ? str(h) : VEMPTY
    }
    const r = sheet.previewRows[row - 2]
    if (!r) return VEMPTY
    const c = r[col - 1]
    if (c === null || c === undefined) return VEMPTY
    if (typeof c === 'number') return num(c)
    if (typeof c === 'boolean') return bool(c)
    return str(String(c))
  }

  const colLetterToIndex = (letter: string): number => {
    let n = 0
    for (const ch of letter.toUpperCase()) {
      if (ch < 'A' || ch > 'Z') return -1
      n = n * 26 + (ch.charCodeAt(0) - 64)
    }
    return n
  }
  const parseA1 = (a1: string): { row: number; col: number } | null => {
    const m = a1.toUpperCase().match(/^([A-Z]+)(\d+)$/)
    if (!m) return null
    return { col: colLetterToIndex(m[1]), row: parseInt(m[2], 10) }
  }

  const cellObj = (row: number, col: number, address: string): VBObject => ({
    name: `Range(${address})`,
    get(p) {
      const pl = p.toLowerCase()
      if (pl === 'value' || pl === 'value2' || pl === 'text') return getCellValue(row, col)
      if (pl === 'row') return num(row)
      if (pl === 'column') return num(col)
      if (pl === 'address') return str('$' + address.replace(/^\$/, ''))
      if (pl === 'end') {
        return {
          kind: 'obj',
          obj: {
            name: 'EndProxy',
            get() { return VEMPTY },
            set() {},
            call(dir) {
              // Returns the last non-empty cell in that direction.
              // We approximate xlUp by scanning upward; xlDown by scanning down to rowCount+1.
              if (!sheet) return { kind: 'obj', obj: cellObj(row, col, address) }
              const dirLower = String(dir).toLowerCase()
              if (dirLower === 'xlup' || dirLower === '3') {
                let r = Math.min(row, sheet.rowCount + 1)
                while (r > 1 && getCellValue(r, col).kind === 'empty') r--
                return { kind: 'obj', obj: cellObj(r, col, addrOf(r, col)) }
              }
              if (dirLower === 'xldown' || dirLower === '-4121') {
                let r = row
                while (r <= sheet.rowCount + 1 && getCellValue(r, col).kind !== 'empty') r++
                return { kind: 'obj', obj: cellObj(r - 1, col, addrOf(r - 1, col)) }
              }
              return { kind: 'obj', obj: cellObj(row, col, address) }
            },
          },
        }
      }
      return VEMPTY
    },
    set(p, value) {
      const pl = p.toLowerCase()
      if (pl === 'value' || pl === 'value2' || pl === 'text') {
        effects.push({
          kind: 'write',
          sheet: sheetName,
          cell: address,
          value: toStr(value),
        })
      }
    },
    call(method, args) {
      const m = method.toLowerCase()
      if (m === 'end') return this.get('End') === VEMPTY ? VEMPTY : (this.get('End') as Val)
      if (m === 'offset') {
        const dr = args[0] ? toNum(args[0]) : 0
        const dc = args[1] ? toNum(args[1]) : 0
        return { kind: 'obj', obj: cellObj(row + dr, col + dc, addrOf(row + dr, col + dc)) }
      }
      return VEMPTY
    },
  })

  const addrOf = (row: number, col: number): string => {
    let s = ''
    let n = col
    while (n > 0) {
      const rem = (n - 1) % 26
      s = String.fromCharCode(65 + rem) + s
      n = Math.floor((n - 1) / 26)
    }
    return s + row
  }

  const rowsObj: VBObject = {
    name: 'Rows',
    get(p) {
      if (p.toLowerCase() === 'count') return num(sheet?.rowCount ? sheet.rowCount + 50 : 1048576)
      return VEMPTY
    },
    set() {},
    call() { return VEMPTY },
  }

  return {
    name: `Worksheet(${sheetName})`,
    get(prop) {
      const p = prop.toLowerCase()
      if (p === 'name') return str(sheetName)
      if (p === 'rows') return { kind: 'obj', obj: rowsObj }
      if (p === 'columns') return { kind: 'obj', obj: rowsObj }
      return VEMPTY
    },
    set() {},
    call(method, args) {
      const m = method.toLowerCase()
      if (m === 'cells') {
        if (args.length < 2) return VEMPTY
        const r = toNum(args[0])
        let c: number
        if (args[1].kind === 'str') {
          c = colLetterToIndex(args[1].v) || toNum(args[1])
        } else {
          c = toNum(args[1])
        }
        return { kind: 'obj', obj: cellObj(r, c, addrOf(r, c)) }
      }
      if (m === 'range') {
        const a1 = toStr(args[0])
        const parsed = parseA1(a1)
        if (parsed) return { kind: 'obj', obj: cellObj(parsed.row, parsed.col, a1) }
        return VEMPTY
      }
      return VEMPTY
    },
  }
}

function makeWorkbookObj(workbook: WorkbookData | undefined, effects: SideEffect[]): VBObject {
  return {
    name: 'ThisWorkbook',
    get(prop) {
      if (prop.toLowerCase() === 'worksheets' || prop.toLowerCase() === 'sheets') {
        return {
          kind: 'obj',
          obj: {
            name: 'Worksheets',
            get() { return VEMPTY },
            set() {},
            call(_m, args) {
              // collection access: ThisWorkbook.Worksheets("Name")
              const arg0 = args[0]
              if (!arg0) return VNOTHING
              const name = toStr(arg0)
              return { kind: 'obj', obj: makeWorksheetObj(workbook, name, effects) }
            },
          },
        }
      }
      return VEMPTY
    },
    set() {},
    call(method, args) {
      const m = method.toLowerCase()
      if (m === 'worksheets' || m === 'sheets') {
        const name = toStr(args[0])
        return { kind: 'obj', obj: makeWorksheetObj(workbook, name, effects) }
      }
      return VEMPTY
    },
  }
}

// ---------- Form (Me) object ----------
function makeControlObj(
  state: ControlState,
  onChange: (next: ControlState) => void,
): VBObject {
  return {
    name: state.name,
    get(prop) {
      const p = prop.toLowerCase()
      if (p === 'text') return str(state.text)
      if (p === 'value') {
        if (typeof state.value === 'boolean') return bool(state.value)
        if (typeof state.value === 'number') return num(state.value)
        return str(String(state.value))
      }
      if (p === 'caption') return str(state.text)
      if (p === 'name') return str(state.name)
      if (p === 'enabled') return bool(state.enabled)
      if (p === 'visible') return bool(state.visible)
      if (p === 'listcount') return num(state.list.length)
      if (p === 'listindex') {
        const idx = state.list.indexOf(String(state.value))
        return num(idx)
      }
      return VEMPTY
    },
    set(prop, value) {
      const p = prop.toLowerCase()
      const next = { ...state }
      if (p === 'text' || p === 'caption') next.text = toStr(value)
      else if (p === 'value') {
        if (value.kind === 'bool') next.value = value.v
        else if (value.kind === 'num') next.value = value.v
        else next.value = toStr(value)
        // Mirror combo's selected value into text
        if (next.type === 'ComboBox' || next.type === 'TextBox') next.text = toStr(value)
      } else if (p === 'enabled') next.enabled = toBool(value)
      else if (p === 'visible') next.visible = toBool(value)
      else return
      Object.assign(state, next)
      onChange(state)
    },
    call(method, args) {
      const m = method.toLowerCase()
      if (m === 'clear') {
        state.list = []
        onChange(state)
        return VEMPTY
      }
      if (m === 'additem') {
        if (args[0]) state.list.push(toStr(args[0]))
        onChange(state)
        return VEMPTY
      }
      if (m === 'removeitem') {
        const idx = args[0] ? toNum(args[0]) : 0
        state.list.splice(idx, 1)
        onChange(state)
        return VEMPTY
      }
      if (m === 'setfocus') {
        return VEMPTY
      }
      return VEMPTY
    },
  }
}

export function controlFromBase(c: ControlBase): ControlState {
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    text:
      c.text !== undefined
        ? String(c.text)
        : c.caption !== undefined
          ? String(c.caption)
          : '',
    value:
      typeof c.value === 'boolean'
        ? c.value
        : c.value !== undefined
          ? String(c.value)
          : '',
    list: Array.isArray(c.listItems) ? [...c.listItems] : [],
    enabled: c.enabled !== false,
    visible: c.visible !== false,
  }
}

function makeFormObj(
  form: UserForm,
  states: Map<string, ControlState>,
  effects: SideEffect[],
  onControlChange: (id: string) => void,
): VBObject {
  return {
    name: form.name,
    get(prop) {
      const p = prop.toLowerCase()
      if (p === 'caption') return str(form.caption)
      if (p === 'name') return str(form.name)
      // Control lookup by name
      for (const c of form.controls) {
        if (c.name.toLowerCase() === p) {
          const st = states.get(c.id)!
          return {
            kind: 'obj',
            obj: makeControlObj(st, () => onControlChange(c.id)),
          }
        }
      }
      return VEMPTY
    },
    set(prop, value) {
      const p = prop.toLowerCase()
      if (p === 'caption') {
        form.caption = toStr(value)
      }
    },
    call(method) {
      const m = method.toLowerCase()
      if (m === 'show') {
        effects.push({ kind: 'log', message: 'Me.Show called' })
        return VEMPTY
      }
      if (m === 'hide') {
        effects.push({ kind: 'log', message: 'Me.Hide called' })
        return VEMPTY
      }
      // Treat as control lookup as a fallback
      for (const c of form.controls) {
        if (c.name.toLowerCase() === m) {
          const st = states.get(c.id)!
          return {
            kind: 'obj',
            obj: makeControlObj(st, () => onControlChange(c.id)),
          }
        }
      }
      return VEMPTY
    },
  }
}

// ---------- Built-ins ----------
type Builtin = (args: Val[], ctx: ExecContext) => Val

function makeBuiltins(): Record<string, Builtin> {
  return {
    msgbox: (args, ctx) => {
      const message = toStr(args[0] ?? VEMPTY)
      const buttons = args[1] ? toNum(args[1]) : 0
      const title = args[2] ? toStr(args[2]) : undefined
      ctx.effects.push({ kind: 'msgbox', message, buttons, title })
      return num(1)
    },
    len: (args) => num(toStr(args[0] ?? VEMPTY).length),
    trim: (args) => str(toStr(args[0] ?? VEMPTY).trim()),
    ltrim: (args) => str(toStr(args[0] ?? VEMPTY).replace(/^\s+/, '')),
    rtrim: (args) => str(toStr(args[0] ?? VEMPTY).replace(/\s+$/, '')),
    ucase: (args) => str(toStr(args[0] ?? VEMPTY).toUpperCase()),
    lcase: (args) => str(toStr(args[0] ?? VEMPTY).toLowerCase()),
    left: (args) => str(toStr(args[0] ?? VEMPTY).slice(0, toNum(args[1] ?? num(0)))),
    right: (args) => {
      const s = toStr(args[0] ?? VEMPTY)
      const n = toNum(args[1] ?? num(0))
      return str(n >= s.length ? s : s.slice(s.length - n))
    },
    mid: (args) => {
      const s = toStr(args[0] ?? VEMPTY)
      const start = Math.max(1, toNum(args[1] ?? num(1)))
      if (args[2] === undefined) return str(s.slice(start - 1))
      return str(s.slice(start - 1, start - 1 + toNum(args[2])))
    },
    chr: (args) => str(String.fromCharCode(toNum(args[0] ?? num(0)))),
    asc: (args) => num(toStr(args[0] ?? VEMPTY).charCodeAt(0) ?? 0),
    cstr: (args) => str(toStr(args[0] ?? VEMPTY)),
    cint: (args) => num(Math.round(toNum(args[0] ?? VEMPTY))),
    clng: (args) => num(Math.trunc(toNum(args[0] ?? VEMPTY))),
    cdbl: (args) => num(toNum(args[0] ?? VEMPTY)),
    cbool: (args) => bool(toBool(args[0] ?? VEMPTY)),
    iif: (args) => (toBool(args[0] ?? VEMPTY) ? (args[1] ?? VEMPTY) : (args[2] ?? VEMPTY)),
    isempty: (args) => bool((args[0] ?? VEMPTY).kind === 'empty'),
    isnull: (args) => bool((args[0] ?? VEMPTY).kind === 'null'),
    isnumeric: (args) => {
      const v = args[0] ?? VEMPTY
      if (v.kind === 'num') return bool(true)
      if (v.kind === 'str') return bool(!Number.isNaN(Number(v.v)) && v.v.trim() !== '')
      return bool(false)
    },
    now: () => str(new Date().toISOString()),
    date: () => str(new Date().toISOString().slice(0, 10)),
    str: (args) => str(' ' + toStr(args[0] ?? VEMPTY)),
    val: (args) => num(parseFloat(toStr(args[0] ?? VEMPTY))),
    unload: (_args, ctx) => {
      ctx.effects.push({ kind: 'unload' })
      ctx.unloadRequested = true
      return VEMPTY
    },
  }
}

// VBA constants commonly referenced
const VB_CONSTANTS: Record<string, Val> = {
  vbcrlf: str('\r\n'),
  vbcr: str('\r'),
  vblf: str('\n'),
  vbtab: str('\t'),
  vbnewline: str('\n'),
  vbnullstring: str(''),
  vbinformation: num(64),
  vbcritical: num(16),
  vbexclamation: num(48),
  vbquestion: num(32),
  vbyes: num(6),
  vbno: num(7),
  vbok: num(1),
  vbokonly: num(0),
  vbyesno: num(4),
  vbyesnocancel: num(3),
  xlup: str('xlUp'),
  xldown: str('xlDown'),
  xltoright: str('xlToRight'),
  xltoleft: str('xlToLeft'),
}

// ---------- Execution ----------
type Scope = {
  parent?: Scope
  vars: Map<string, Val>
}

function makeScope(parent?: Scope): Scope {
  return { parent, vars: new Map() }
}

function getVar(scope: Scope, name: string): Val | undefined {
  const k = name.toLowerCase()
  if (scope.vars.has(k)) return scope.vars.get(k)
  if (scope.parent) return getVar(scope.parent, name)
  return undefined
}

function setVar(scope: Scope, name: string, value: Val): void {
  const k = name.toLowerCase()
  let s: Scope | undefined = scope
  while (s) {
    if (s.vars.has(k)) {
      s.vars.set(k, value)
      return
    }
    s = s.parent
  }
  scope.vars.set(k, value)
}

function declVar(scope: Scope, name: string, value: Val): void {
  scope.vars.set(name.toLowerCase(), value)
}

export type ExecContext = {
  module: Module
  globalScope: Scope
  form: UserForm
  controlStates: Map<string, ControlState>
  workbook?: WorkbookData
  effects: SideEffect[]
  builtins: Record<string, Builtin>
  meObj: VBObject
  workbookObj: VBObject
  withStack: Val[]
  unloadRequested: boolean
  onControlChange: (id: string) => void
}

class ExitForSignal {}
class ExitDoSignal {}
class ExitSubSignal {}

export function makeContext(
  source: string,
  form: UserForm,
  workbook: WorkbookData | undefined,
  onControlChange: (id: string) => void,
): ExecContext {
  const module = parse(source)
  const controlStates = new Map<string, ControlState>()
  for (const c of form.controls) controlStates.set(c.id, controlFromBase(c))
  const effects: SideEffect[] = []
  const globalScope = makeScope()
  const ctx: ExecContext = {
    module,
    globalScope,
    form,
    controlStates,
    workbook,
    effects,
    builtins: makeBuiltins(),
    meObj: undefined as unknown as VBObject,
    workbookObj: undefined as unknown as VBObject,
    withStack: [],
    unloadRequested: false,
    onControlChange,
  }
  ctx.meObj = makeFormObj(form, controlStates, effects, onControlChange)
  ctx.workbookObj = makeWorkbookObj(workbook, effects)

  // Module-level Dim
  for (const d of module.dims) execStmt(d, ctx.globalScope, ctx)

  return ctx
}

export function runProcedure(ctx: ExecContext, name: string, args: Val[] = []): void {
  const proc = ctx.module.procedures.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (!proc) {
    ctx.effects.push({ kind: 'log', message: `(procedure '${name}' not found — skipped)` })
    return
  }
  const scope = makeScope(ctx.globalScope)
  proc.params.forEach((p, i) => declVar(scope, p.name, args[i] ?? VEMPTY))
  try {
    execBlock(proc.body, scope, ctx)
  } catch (e) {
    if (e instanceof ExitSubSignal) return
    throw e
  }
}

function execBlock(stmts: Stmt[], scope: Scope, ctx: ExecContext): void {
  for (const s of stmts) {
    if (ctx.unloadRequested) return
    execStmt(s, scope, ctx)
  }
}

function execStmt(s: Stmt, scope: Scope, ctx: ExecContext): void {
  switch (s.type) {
    case 'Dim': {
      for (const d of s.names) declVar(scope, d.name, VEMPTY)
      return
    }
    case 'Const': {
      declVar(scope, s.name, evalExpr(s.expr, scope, ctx))
      return
    }
    case 'Assign': {
      const value = evalExpr(s.expr, scope, ctx)
      assignTo(s.target, value, scope, ctx)
      return
    }
    case 'Set': {
      const value = evalExpr(s.expr, scope, ctx)
      assignTo(s.target, value, scope, ctx)
      return
    }
    case 'If': {
      if (toBool(evalExpr(s.cond, scope, ctx))) {
        execBlock(s.then, scope, ctx)
      } else {
        let matched = false
        for (const ei of s.elseifs) {
          if (toBool(evalExpr(ei.cond, scope, ctx))) {
            execBlock(ei.body, scope, ctx)
            matched = true
            break
          }
        }
        if (!matched && s.else) execBlock(s.else, scope, ctx)
      }
      return
    }
    case 'For': {
      const from = toNum(evalExpr(s.from, scope, ctx))
      const to = toNum(evalExpr(s.to, scope, ctx))
      const step = s.step ? toNum(evalExpr(s.step, scope, ctx)) : 1
      let i = from
      declVar(scope, s.varName, num(i))
      const cond = () => (step >= 0 ? i <= to : i >= to)
      try {
        while (cond()) {
          if (ctx.unloadRequested) return
          setVar(scope, s.varName, num(i))
          execBlock(s.body, scope, ctx)
          i += step
        }
      } catch (e) {
        if (e instanceof ExitForSignal) return
        throw e
      }
      return
    }
    case 'ForEach': {
      const colVal = evalExpr(s.collection, scope, ctx)
      const items: Val[] = []
      if (colVal.kind === 'obj') {
        // No real collection support — try Count + Item
      }
      try {
        for (const it of items) {
          declVar(scope, s.varName, it)
          execBlock(s.body, scope, ctx)
        }
      } catch (e) {
        if (e instanceof ExitForSignal) return
        throw e
      }
      return
    }
    case 'Do': {
      const checkPre = () => {
        if (s.whileCond) return toBool(evalExpr(s.whileCond, scope, ctx))
        if (s.untilCond) return !toBool(evalExpr(s.untilCond, scope, ctx))
        return true
      }
      const checkPost = () => {
        if (s.postWhile) return toBool(evalExpr(s.postWhile, scope, ctx))
        if (s.postUntil) return !toBool(evalExpr(s.postUntil, scope, ctx))
        return false
      }
      const isPostTest = !s.whileCond && !s.untilCond
      try {
        let iter = 0
        do {
          if (iter++ > 100000) throw new Error('Do loop iteration limit')
          if (!isPostTest && !checkPre()) break
          execBlock(s.body, scope, ctx)
        } while (isPostTest ? checkPost() : checkPre())
      } catch (e) {
        if (e instanceof ExitDoSignal) return
        throw e
      }
      return
    }
    case 'While': {
      let iter = 0
      while (toBool(evalExpr(s.cond, scope, ctx))) {
        if (iter++ > 100000) throw new Error('While loop iteration limit')
        execBlock(s.body, scope, ctx)
      }
      return
    }
    case 'With': {
      const t = evalExpr(s.target, scope, ctx)
      ctx.withStack.push(t)
      try {
        execBlock(s.body, scope, ctx)
      } finally {
        ctx.withStack.pop()
      }
      return
    }
    case 'CallStmt': {
      evalExpr(s.expr, scope, ctx)
      return
    }
    case 'Exit': {
      if (s.kind === 'For') throw new ExitForSignal()
      if (s.kind === 'Do') throw new ExitDoSignal()
      throw new ExitSubSignal()
    }
  }
}

function assignTo(target: Expr, value: Val, scope: Scope, ctx: ExecContext): void {
  if (target.type === 'Ident') {
    setVar(scope, target.name, value)
    return
  }
  if (target.type === 'Member') {
    const t = evalExpr(target.target, scope, ctx)
    if (t.kind === 'obj') {
      t.obj.set(target.name, value)
      return
    }
  }
  if (target.type === 'Call') {
    // a(b) = value → property/indexer set
    const baseVal = evalExpr(target.target, scope, ctx)
    if (baseVal.kind === 'obj') {
      // For collection.Item(x) = value, fall through to set property "_" with extra args.
      // Most common case in our codegen is something like ws.Cells(r,c).Value = ...
      // which is parsed as Member of Call — handled above.
    }
  }
}

function evalExpr(e: Expr, scope: Scope, ctx: ExecContext): Val {
  switch (e.type) {
    case 'NumLit':
      return num(e.value)
    case 'StrLit':
      return str(e.value)
    case 'BoolLit':
      return bool(e.value)
    case 'Empty':
      return VEMPTY
    case 'Null':
      return VNULL
    case 'Nothing':
      return VNOTHING
    case 'Ident':
      return resolveIdent(e.name, scope, ctx)
    case 'Member':
      return evalMember(e.target, e.name, scope, ctx)
    case 'Call':
      return evalCall(e.target, e.args, scope, ctx)
    case 'Unary': {
      const v = evalExpr(e.expr, scope, ctx)
      if (e.op === 'Not') return bool(!toBool(v))
      if (e.op === '-') return num(-toNum(v))
      if (e.op === '+') return num(+toNum(v))
      return v
    }
    case 'Binary': {
      const l = evalExpr(e.left, scope, ctx)
      const r = evalExpr(e.right, scope, ctx)
      switch (e.op) {
        case '+': {
          if (l.kind === 'str' || r.kind === 'str') return str(toStr(l) + toStr(r))
          return num(toNum(l) + toNum(r))
        }
        case '-': return num(toNum(l) - toNum(r))
        case '*': return num(toNum(l) * toNum(r))
        case '/': return num(toNum(l) / toNum(r))
        case '\\': return num(Math.trunc(toNum(l) / toNum(r)))
        case 'Mod': return num(toNum(l) % toNum(r))
        case '^': return num(Math.pow(toNum(l), toNum(r)))
        case '&': return str(toStr(l) + toStr(r))
        case '=': return bool(equals(l, r))
        case '<>': return bool(!equals(l, r))
        case '<': return bool(compare(l, r) < 0)
        case '<=': return bool(compare(l, r) <= 0)
        case '>': return bool(compare(l, r) > 0)
        case '>=': return bool(compare(l, r) >= 0)
        case 'And': return bool(toBool(l) && toBool(r))
        case 'Or': return bool(toBool(l) || toBool(r))
        case 'Xor': return bool(toBool(l) !== toBool(r))
        case 'Is': return bool(
          l.kind === 'obj' && r.kind === 'obj' ? l.obj === r.obj
            : (l.kind === 'nothing' && r.kind === 'nothing'),
        )
      }
    }
  }
}

function resolveIdent(name: string, scope: Scope, ctx: ExecContext): Val {
  const lname = name.toLowerCase()
  // With target?
  if (lname === 'me') return { kind: 'obj', obj: ctx.meObj }
  if (lname === 'thisworkbook' || lname === 'activeworkbook') return { kind: 'obj', obj: ctx.workbookObj }
  if (lname === 'application') {
    return {
      kind: 'obj',
      obj: {
        name: 'Application',
        get: () => VEMPTY,
        set: () => {},
        call: () => VEMPTY,
      },
    }
  }
  const con = VB_CONSTANTS[lname]
  if (con !== undefined) return con
  const v = getVar(scope, name)
  if (v !== undefined) return v
  // Procedure or builtin? Resolve at call site instead.
  // Worksheets("Foo") at top level
  if (lname === 'worksheets' || lname === 'sheets') {
    return ctx.workbookObj.get('Worksheets')
  }
  // Form's controls accessible without Me
  for (const c of ctx.form.controls) {
    if (c.name.toLowerCase() === lname) {
      const st = ctx.controlStates.get(c.id)!
      return {
        kind: 'obj',
        obj: makeControlObj(st, () => ctx.onControlChange(c.id)),
      }
    }
  }
  return VEMPTY
}

function evalMember(targetExpr: Expr, name: string, scope: Scope, ctx: ExecContext): Val {
  const t = evalExpr(targetExpr, scope, ctx)
  if (t.kind === 'obj') return t.obj.get(name)
  return VEMPTY
}

function evalCall(targetExpr: Expr, args: Expr[], scope: Scope, ctx: ExecContext): Val {
  // Identifier or member call
  if (targetExpr.type === 'Ident') {
    const lname = targetExpr.name.toLowerCase()
    // Builtin?
    const bi = ctx.builtins[lname]
    if (bi) return bi(args.map((a) => evalExpr(a, scope, ctx)), ctx)
    // User-defined procedure?
    const proc = ctx.module.procedures.find((p) => p.name.toLowerCase() === lname)
    if (proc) {
      const vals = args.map((a) => evalExpr(a, scope, ctx))
      const fnScope = makeScope(ctx.globalScope)
      proc.params.forEach((p, i) => declVar(fnScope, p.name, vals[i] ?? VEMPTY))
      try {
        execBlock(proc.body, fnScope, ctx)
      } catch (e) {
        if (!(e instanceof ExitSubSignal)) throw e
      }
      // Return value via name (simplified)
      return getVar(fnScope, proc.name) ?? VEMPTY
    }
    // Variable that holds an object → call its default? Not supported.
    const v = getVar(scope, targetExpr.name)
    if (v?.kind === 'obj') {
      // No default method; ignore
    }
    // Unknown identifier called — treat as no-op
    ctx.effects.push({ kind: 'log', message: `(${targetExpr.name}: not implemented)` })
    return VEMPTY
  }
  if (targetExpr.type === 'Member') {
    const t = evalExpr(targetExpr.target, scope, ctx)
    const vals = args.map((a) => evalExpr(a, scope, ctx))
    if (t.kind === 'obj') return t.obj.call(targetExpr.name, vals)
    return VEMPTY
  }
  // Calling result of another call
  const t = evalExpr(targetExpr, scope, ctx)
  if (t.kind === 'obj') {
    // No default member; ignore
  }
  return VEMPTY
}

// ---------- Public API ----------
export function runEvent(
  ctx: ExecContext,
  procName: string,
): { effects: SideEffect[]; unloaded: boolean } {
  ctx.effects.length = 0
  ctx.unloadRequested = false
  try {
    runProcedure(ctx, procName)
  } catch (e) {
    ctx.effects.push({ kind: 'log', message: `Runtime error: ${(e as Error).message}` })
  }
  return { effects: [...ctx.effects], unloaded: ctx.unloadRequested }
}
