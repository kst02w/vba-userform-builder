/**
 * Prompt + response schema for the AI generator.
 *
 * Asks Claude to produce a strict JSON object describing a UserForm and its
 * controls. We then translate that into our internal Project shape.
 */
import type { ControlType, UserForm } from '../types/project'
import { CONTROL_META } from './controls'
import { uid } from './utils'

export const FORM_SCHEMA = `
{
  "name": "UserForm1",                      // VBA module name
  "caption": "顧客登録",                    // form title
  "width": 360, "height": 240,
  "controls": [
    {
      "type": "Label" | "TextBox" | "CommandButton" | "ComboBox" | "ListBox" |
              "CheckBox" | "OptionButton" | "ToggleButton" | "Frame" | "Image" |
              "MultiPage" | "TabStrip" | "ScrollBar" | "SpinButton",
      "name": "TextBox1",                   // VBA control name
      "left": 12, "top": 24,                // position in form-local pixels
      "width": 120, "height": 18,
      "caption": "...",                     // optional, for Label/Button/CheckBox/etc
      "text": "...",                        // optional, for TextBox/ComboBox
      "value": false,                       // optional, for CheckBox/Option/Toggle
      "listItems": ["A", "B"]               // optional, for Combo/List
    }
  ]
}
`.trim()

export const SYSTEM_PROMPT = `あなたは Excel VBA の UserForm 設計支援アシスタントです。
ユーザーの説明（テキスト、画像、シートの構造など）から、対応する UserForm の JSON 定義を生成してください。

【ルール】
1. 出力は JSON オブジェクト一つだけ。コードフェンスや説明文は不要
2. すべてのコントロールには重複しない name を付ける（型名 + 連番。例: TextBox1, CommandButton2）
3. ラベルはテキスト直上または直左に配置し、入力コントロールとペアにする
4. レイアウトは縦方向に整列し、左マージン 12px、フィールド間隔 8〜12px を目安に
5. CommandButton は通常フォーム下部に配置（例: 「登録」「キャンセル」）
6. 寸法はピクセル単位。標準的なサイズ: TextBox 120×18, CommandButton 72×24, Label 80×18
7. フォーム幅は配置に必要な分（最小 200, 最大 600）。高さも同様（最小 80, 最大 600）

【スキーマ】
${FORM_SCHEMA}`

export type AIFormSpec = {
  name?: string
  caption?: string
  width?: number
  height?: number
  controls?: AIControlSpec[]
}

export type AIControlSpec = {
  type: ControlType
  name?: string
  left?: number
  top?: number
  width?: number
  height?: number
  caption?: string
  text?: string
  value?: string | number | boolean
  listItems?: string[]
}

/** Tries to extract a JSON object from a (possibly fenced) text response. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  // strip code fences if any
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced ? fenced[1] : trimmed
  return JSON.parse(candidate)
}

/** Convert an AI spec into a UserForm we can drop into the project. */
export function specToUserForm(spec: AIFormSpec): UserForm {
  const formId = uid('frm')
  const validTypes = new Set(Object.keys(CONTROL_META))
  const controls = (spec.controls ?? [])
    .filter((c) => validTypes.has(c.type))
    .map((c, i) => {
      const meta = CONTROL_META[c.type]
      const w = c.width ?? meta.defaultWidth
      const h = c.height ?? meta.defaultHeight
      const defaults = meta.defaultProps()
      return {
        id: uid('ctl'),
        type: c.type,
        name: c.name ?? `${meta.namePrefix}${i + 1}`,
        left: Math.max(0, Math.round(c.left ?? 12)),
        top: Math.max(0, Math.round(c.top ?? 12 + i * 24)),
        width: Math.max(8, Math.round(w)),
        height: Math.max(8, Math.round(h)),
        enabled: true,
        visible: true,
        tabIndex: i,
        tabStop: true,
        ...defaults,
        caption: c.caption ?? defaults.caption,
        text: c.text !== undefined ? String(c.text) : (defaults.text as string | undefined),
        value: c.value ?? defaults.value,
        listItems: c.listItems ?? (defaults.listItems as string[] | undefined),
      }
    })

  return {
    id: formId,
    name: spec.name ?? 'UserForm1',
    caption: spec.caption ?? spec.name ?? 'UserForm1',
    width: Math.max(80, spec.width ?? 360),
    height: Math.max(60, spec.height ?? 240),
    backColor: '#F0F0F0',
    controls,
    code: 'Option Explicit\r\n\r\n',
  }
}
