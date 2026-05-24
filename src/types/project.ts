export type ControlType =
  | 'Label'
  | 'TextBox'
  | 'CommandButton'
  | 'ComboBox'
  | 'ListBox'
  | 'CheckBox'
  | 'OptionButton'
  | 'ToggleButton'
  | 'Frame'
  | 'Image'
  | 'MultiPage'
  | 'TabStrip'
  | 'ScrollBar'
  | 'SpinButton'

export type ControlBase = {
  id: string
  type: ControlType
  /** VBA control name (e.g., "TextBox1"). Unique within a form. */
  name: string
  /** position in form-local pixels */
  left: number
  top: number
  /** size in form-local pixels */
  width: number
  height: number

  /** Common props (all optional, applied to most controls) */
  caption?: string
  text?: string
  value?: string | number | boolean

  enabled?: boolean
  visible?: boolean
  tabIndex?: number
  tabStop?: boolean
  controlTipText?: string

  /** Font */
  fontName?: string
  fontSize?: number
  fontBold?: boolean
  fontItalic?: boolean
  fontUnderline?: boolean

  /** Colors (hex like #RRGGBB) */
  foreColor?: string
  backColor?: string
  borderColor?: string
  borderStyle?: 'none' | 'single'
  specialEffect?: 'flat' | 'raised' | 'sunken' | 'etched' | 'bump'

  /** TextBox-specific */
  multiLine?: boolean
  maxLength?: number
  passwordChar?: string
  textAlign?: 'left' | 'center' | 'right'

  /** ListBox/ComboBox-specific */
  listItems?: string[]
  listIndex?: number
  rowSource?: string

  /** CheckBox/OptionButton-specific */
  groupName?: string

  /** Image-specific */
  picture?: string // data URL
  pictureSizeMode?: 'clip' | 'stretch' | 'zoom'

  /** Index signature for forward-compat (must be unknown to keep type safety) */
  [key: string]: unknown
}

/** Cached worksheet data uploaded by the user (browser-local). */
export type SheetData = {
  name: string
  /** Detected header row values (row 1 by default). */
  headers: string[]
  /** Preview rows (first N) — used for UI; codegen uses headers only. */
  previewRows: (string | number | boolean | null)[][]
  /** Total row count (excluding header). */
  rowCount: number
}

export type WorkbookData = {
  fileName: string
  uploadedAt: string
  sheets: SheetData[]
}

/** Cell reference like { sheet: "Sheet1", column: "A" } or { sheet, cell: "B2" } */
export type CellRef = { sheet: string; cell: string }
export type ColumnRef = { sheet: string; column: string }

export type ControlMapping = {
  /** ComboBox/ListBox: column of items to load on Initialize */
  source?: ColumnRef
  /** TextBox/CheckBox/ComboBox: cell to load into the control on Initialize */
  initFrom?: CellRef
  /** TextBox/CheckBox/ComboBox: column to write to on Submit (row = next empty row in targetSheet) */
  writeToColumn?: ColumnRef
}

export type FormMapping = {
  /** Control id → mapping settings. */
  controls: Record<string, ControlMapping>
  /** Name of the CommandButton that triggers Submit. */
  submitButtonName?: string
  /** Sheet where new rows are appended on Submit. */
  targetSheet?: string
}

export type UserForm = {
  id: string
  /** VBA module name, e.g., "UserForm1" */
  name: string
  caption: string
  width: number
  height: number
  backColor: string
  controls: ControlBase[]
  /** VBA code-behind for this form */
  code: string
  /** Worksheet integration mapping (optional) */
  mapping?: FormMapping
}

export type CodeModule = {
  id: string
  name: string
  kind: 'standard' | 'class'
  code: string
}

export type EditorTarget =
  | { kind: 'form'; formId: string }
  | { kind: 'module'; moduleId: string }

export type Project = {
  id: string
  name: string
  forms: UserForm[]
  modules: CodeModule[]
  /** Workbook shared across the project (only one slot for now). */
  workbook?: WorkbookData
  /** UI state (not exported with project but kept for session continuity) */
  selectedFormId?: string
  selectedControlId?: string
  /** Designer vs Code view */
  view?: 'designer' | 'code'
  /** Currently focused code target */
  editorTarget?: EditorTarget
}
