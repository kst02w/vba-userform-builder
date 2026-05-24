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
  /** UI state (not exported with project but kept for session continuity) */
  selectedFormId?: string
  selectedControlId?: string
  /** Designer vs Code view */
  view?: 'designer' | 'code'
  /** Currently focused code target */
  editorTarget?: EditorTarget
}
