/**
 * Event catalog by control type. Each entry describes the VBA event signature
 * Private Sub Name_Event(arg1 As Type, ...).
 */
import type { ControlType } from '../types/project'

export type EventInfo = {
  name: string
  /** parameter list shown inside (...) — empty string means no parameters */
  params: string
  /** Description shown in completion popups */
  description: string
}

const COMMON_EVENTS: EventInfo[] = [
  { name: 'Click', params: '', description: 'クリックされたとき' },
  { name: 'DblClick', params: 'ByVal Cancel As MSForms.ReturnBoolean', description: 'ダブルクリックされたとき' },
  { name: 'GotFocus', params: '', description: 'フォーカスを得たとき' },
  { name: 'LostFocus', params: '', description: 'フォーカスを失ったとき' },
  { name: 'KeyDown', params: 'ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer', description: 'キーが押されたとき' },
  { name: 'KeyUp', params: 'ByVal KeyCode As MSForms.ReturnInteger, ByVal Shift As Integer', description: 'キーが離されたとき' },
  { name: 'KeyPress', params: 'ByVal KeyAscii As MSForms.ReturnInteger', description: '文字キーが押されたとき' },
  { name: 'MouseDown', params: 'ByVal Button As Integer, ByVal Shift As Integer, ByVal X As Single, ByVal Y As Single', description: 'マウスボタンが押されたとき' },
  { name: 'MouseUp', params: 'ByVal Button As Integer, ByVal Shift As Integer, ByVal X As Single, ByVal Y As Single', description: 'マウスボタンが離されたとき' },
  { name: 'MouseMove', params: 'ByVal Button As Integer, ByVal Shift As Integer, ByVal X As Single, ByVal Y As Single', description: 'マウスが動いたとき' },
]

const CHANGE_EVENT: EventInfo = {
  name: 'Change',
  params: '',
  description: '値が変更されたとき',
}

const BEFORE_UPDATE: EventInfo = {
  name: 'BeforeUpdate',
  params: 'ByVal Cancel As MSForms.ReturnBoolean',
  description: '値の更新前',
}

const AFTER_UPDATE: EventInfo = {
  name: 'AfterUpdate',
  params: '',
  description: '値の更新後',
}

const EXIT_ENTER: EventInfo[] = [
  { name: 'Enter', params: '', description: 'フォーカス遷入時' },
  { name: 'Exit', params: 'ByVal Cancel As MSForms.ReturnBoolean', description: 'フォーカス遷出時' },
]

const SPIN_UP_DOWN: EventInfo[] = [
  { name: 'SpinUp', params: '', description: '上ボタン' },
  { name: 'SpinDown', params: '', description: '下ボタン' },
]

const SCROLL: EventInfo = {
  name: 'Scroll',
  params: '',
  description: 'スクロールされたとき',
}

export const EVENTS_BY_TYPE: Record<ControlType, EventInfo[]> = {
  Label: [...COMMON_EVENTS],
  TextBox: [CHANGE_EVENT, BEFORE_UPDATE, AFTER_UPDATE, ...EXIT_ENTER, ...COMMON_EVENTS],
  CommandButton: [...COMMON_EVENTS],
  ComboBox: [CHANGE_EVENT, BEFORE_UPDATE, AFTER_UPDATE, ...EXIT_ENTER, ...COMMON_EVENTS],
  ListBox: [CHANGE_EVENT, BEFORE_UPDATE, AFTER_UPDATE, ...EXIT_ENTER, ...COMMON_EVENTS],
  CheckBox: [CHANGE_EVENT, ...COMMON_EVENTS],
  OptionButton: [CHANGE_EVENT, ...COMMON_EVENTS],
  ToggleButton: [CHANGE_EVENT, ...COMMON_EVENTS],
  Frame: [...COMMON_EVENTS, SCROLL],
  Image: [...COMMON_EVENTS],
  MultiPage: [CHANGE_EVENT, ...COMMON_EVENTS],
  TabStrip: [CHANGE_EVENT, ...COMMON_EVENTS],
  ScrollBar: [CHANGE_EVENT, SCROLL, ...COMMON_EVENTS],
  SpinButton: [CHANGE_EVENT, ...SPIN_UP_DOWN, ...COMMON_EVENTS],
}

export const FORM_EVENTS: EventInfo[] = [
  { name: 'Initialize', params: '', description: 'フォームが初期化されるとき' },
  { name: 'Activate', params: '', description: 'アクティブになったとき' },
  { name: 'Deactivate', params: '', description: '非アクティブになったとき' },
  { name: 'QueryClose', params: 'Cancel As Integer, CloseMode As Integer', description: '閉じる前' },
  { name: 'Terminate', params: '', description: '破棄されるとき' },
  { name: 'Click', params: '', description: 'フォームがクリックされたとき' },
  { name: 'Resize', params: '', description: 'サイズ変更時' },
]

/**
 * Common properties available on most MSForms controls.
 */
export const COMMON_CONTROL_PROPERTIES = [
  'Name', 'Caption', 'Text', 'Value', 'Enabled', 'Visible',
  'Left', 'Top', 'Width', 'Height',
  'BackColor', 'ForeColor', 'BorderColor', 'BorderStyle',
  'Font', 'ControlTipText',
  'TabIndex', 'TabStop', 'Tag', 'Locked',
]

export const COMMON_CONTROL_METHODS = ['SetFocus', 'Move', 'ZOrder', 'AddItem', 'RemoveItem', 'Clear']

/**
 * Generate an event stub.
 */
export function makeEventStub(
  ownerName: string,
  event: EventInfo,
  indent = '    ',
): string {
  return `Private Sub ${ownerName}_${event.name}(${event.params})\r\n${indent}\r\nEnd Sub\r\n`
}
