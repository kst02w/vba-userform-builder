/**
 * Built-in form templates. Selecting one appends a fresh UserForm to the
 * current project, ready to customize.
 */
import type { ControlBase, ControlType, UserForm } from '../types/project'
import { CONTROL_META } from './controls'
import { uid } from './utils'

type ControlSpec = {
  type: ControlType
  name?: string
  left: number
  top: number
  width?: number
  height?: number
  caption?: string
  text?: string
  listItems?: string[]
  value?: boolean | string
}

type TemplateSpec = {
  id: string
  title: string
  description: string
  formName: string
  caption: string
  width: number
  height: number
  controls: ControlSpec[]
  code?: string
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'customer-register',
    title: '顧客登録フォーム',
    description: '氏名・連絡先・メモを入力して登録ボタンで保存',
    formName: 'frmCustomer',
    caption: '顧客登録',
    width: 360,
    height: 280,
    controls: [
      { type: 'Label', name: 'lblName', left: 12, top: 12, width: 60, caption: '氏名' },
      { type: 'TextBox', name: 'txtName', left: 80, top: 12, width: 220 },
      { type: 'Label', name: 'lblKana', left: 12, top: 38, width: 60, caption: 'フリガナ' },
      { type: 'TextBox', name: 'txtKana', left: 80, top: 38, width: 220 },
      { type: 'Label', name: 'lblTel', left: 12, top: 64, width: 60, caption: '電話番号' },
      { type: 'TextBox', name: 'txtTel', left: 80, top: 64, width: 160 },
      { type: 'Label', name: 'lblMail', left: 12, top: 90, width: 60, caption: 'メール' },
      { type: 'TextBox', name: 'txtMail', left: 80, top: 90, width: 220 },
      { type: 'Label', name: 'lblNote', left: 12, top: 116, width: 60, caption: 'メモ' },
      { type: 'TextBox', name: 'txtNote', left: 80, top: 116, width: 220, height: 60 },
      { type: 'CheckBox', name: 'chkNewsletter', left: 80, top: 184, width: 200, caption: 'メルマガを希望する' },
      { type: 'CommandButton', name: 'cmdSubmit', left: 168, top: 220, width: 60, caption: '登録' },
      { type: 'CommandButton', name: 'cmdCancel', left: 236, top: 220, width: 60, caption: 'キャンセル' },
    ],
    code: `Option Explicit\r\n\r\nPrivate Sub cmdCancel_Click()\r\n    Unload Me\r\nEnd Sub\r\n`,
  },
  {
    id: 'survey',
    title: 'アンケートフォーム',
    description: '満足度・年代・自由記述',
    formName: 'frmSurvey',
    caption: 'お客様アンケート',
    width: 380,
    height: 280,
    controls: [
      { type: 'Label', name: 'lblTitle', left: 12, top: 8, width: 360, caption: 'ご回答ありがとうございます' },
      { type: 'Label', name: 'lblSat', left: 12, top: 36, width: 100, caption: '満足度' },
      { type: 'OptionButton', name: 'opt5', left: 120, top: 36, width: 50, caption: '5' },
      { type: 'OptionButton', name: 'opt4', left: 170, top: 36, width: 50, caption: '4' },
      { type: 'OptionButton', name: 'opt3', left: 220, top: 36, width: 50, caption: '3' },
      { type: 'OptionButton', name: 'opt2', left: 270, top: 36, width: 50, caption: '2' },
      { type: 'OptionButton', name: 'opt1', left: 320, top: 36, width: 50, caption: '1' },
      { type: 'Label', name: 'lblAge', left: 12, top: 64, width: 100, caption: '年代' },
      { type: 'ComboBox', name: 'cmbAge', left: 120, top: 64, width: 100, listItems: ['10代', '20代', '30代', '40代', '50代', '60代+'] },
      { type: 'Label', name: 'lblComment', left: 12, top: 96, width: 100, caption: 'ご意見・ご要望' },
      { type: 'TextBox', name: 'txtComment', left: 12, top: 116, width: 360, height: 100 },
      { type: 'CommandButton', name: 'cmdSubmit', left: 240, top: 224, width: 60, caption: '送信' },
      { type: 'CommandButton', name: 'cmdCancel', left: 308, top: 224, width: 60, caption: 'キャンセル' },
    ],
  },
  {
    id: 'settings',
    title: '設定ダイアログ',
    description: '簡易な設定画面（出力フォルダ・通知）',
    formName: 'frmSettings',
    caption: '設定',
    width: 380,
    height: 220,
    controls: [
      { type: 'Frame', name: 'frmOutput', left: 12, top: 8, width: 356, height: 70, caption: '出力先' },
      { type: 'Label', name: 'lblFolder', left: 24, top: 28, width: 60, caption: 'フォルダ' },
      { type: 'TextBox', name: 'txtFolder', left: 88, top: 28, width: 240 },
      { type: 'CommandButton', name: 'cmdBrowse', left: 332, top: 28, width: 28, caption: '…' },
      { type: 'CheckBox', name: 'chkOpen', left: 24, top: 52, width: 200, caption: '完了後にフォルダを開く' },
      { type: 'Frame', name: 'frmNotify', left: 12, top: 84, width: 356, height: 70, caption: '通知' },
      { type: 'CheckBox', name: 'chkPopup', left: 24, top: 104, width: 200, caption: 'ポップアップで通知' },
      { type: 'CheckBox', name: 'chkSound', left: 24, top: 124, width: 200, caption: '音を鳴らす' },
      { type: 'CommandButton', name: 'cmdOk', left: 236, top: 160, width: 60, caption: 'OK' },
      { type: 'CommandButton', name: 'cmdCancel', left: 304, top: 160, width: 60, caption: 'キャンセル' },
    ],
  },
  {
    id: 'login',
    title: 'ログインダイアログ',
    description: 'シンプルなID/パスワード入力',
    formName: 'frmLogin',
    caption: 'ログイン',
    width: 280,
    height: 160,
    controls: [
      { type: 'Label', name: 'lblId', left: 12, top: 20, width: 60, caption: 'ID' },
      { type: 'TextBox', name: 'txtId', left: 80, top: 20, width: 180 },
      { type: 'Label', name: 'lblPw', left: 12, top: 50, width: 60, caption: 'パスワード' },
      { type: 'TextBox', name: 'txtPw', left: 80, top: 50, width: 180 },
      { type: 'CommandButton', name: 'cmdOk', left: 128, top: 100, width: 60, caption: 'OK' },
      { type: 'CommandButton', name: 'cmdCancel', left: 196, top: 100, width: 60, caption: 'キャンセル' },
    ],
  },
]

export function templateToForm(t: TemplateSpec): UserForm {
  const controls: ControlBase[] = t.controls.map((c, i) => {
    const meta = CONTROL_META[c.type]
    const defaults = meta.defaultProps()
    return {
      id: uid('ctl'),
      type: c.type,
      name: c.name ?? `${meta.namePrefix}${i + 1}`,
      left: c.left,
      top: c.top,
      width: c.width ?? meta.defaultWidth,
      height: c.height ?? meta.defaultHeight,
      enabled: true,
      visible: true,
      tabIndex: i,
      tabStop: true,
      ...defaults,
      caption: c.caption ?? defaults.caption,
      text: c.text !== undefined ? c.text : (defaults.text as string | undefined),
      value: c.value ?? defaults.value,
      listItems: c.listItems ?? (defaults.listItems as string[] | undefined),
    }
  })
  return {
    id: uid('frm'),
    name: t.formName,
    caption: t.caption,
    width: t.width,
    height: t.height,
    backColor: '#F0F0F0',
    controls,
    code: t.code ?? 'Option Explicit\r\n\r\n',
  }
}
