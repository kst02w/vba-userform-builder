import type { ControlBase, ControlType } from '../types/project'
import {
  Type,
  TextCursorInput,
  RectangleHorizontal,
  ChevronDown,
  List,
  CheckSquare,
  Circle,
  ToggleLeft,
  SquareDashed,
  Image,
  Layers,
  PanelTop,
  MoveVertical,
  ChevronsUpDown,
  type LucideIcon,
} from 'lucide-react'

export type ControlMeta = {
  type: ControlType
  /** label for the toolbox */
  label: string
  /** default VBA name prefix (e.g., "TextBox" → "TextBox1") */
  namePrefix: string
  icon: LucideIcon
  defaultWidth: number
  defaultHeight: number
  defaultProps: () => Partial<ControlBase>
}

export const CONTROL_CATALOG: ControlMeta[] = [
  {
    type: 'Label',
    label: 'ラベル',
    namePrefix: 'Label',
    icon: Type,
    defaultWidth: 72,
    defaultHeight: 18,
    defaultProps: () => ({
      caption: 'Label',
      foreColor: '#000000',
      backColor: 'transparent',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'TextBox',
    label: 'テキストボックス',
    namePrefix: 'TextBox',
    icon: TextCursorInput,
    defaultWidth: 96,
    defaultHeight: 18,
    defaultProps: () => ({
      text: '',
      backColor: '#FFFFFF',
      foreColor: '#000000',
      borderStyle: 'single',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'CommandButton',
    label: 'コマンドボタン',
    namePrefix: 'CommandButton',
    icon: RectangleHorizontal,
    defaultWidth: 72,
    defaultHeight: 24,
    defaultProps: () => ({
      caption: 'CommandButton',
      backColor: '#F0F0F0',
      foreColor: '#000000',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'ComboBox',
    label: 'コンボボックス',
    namePrefix: 'ComboBox',
    icon: ChevronDown,
    defaultWidth: 96,
    defaultHeight: 18,
    defaultProps: () => ({
      backColor: '#FFFFFF',
      foreColor: '#000000',
      listItems: [],
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'ListBox',
    label: 'リストボックス',
    namePrefix: 'ListBox',
    icon: List,
    defaultWidth: 96,
    defaultHeight: 60,
    defaultProps: () => ({
      backColor: '#FFFFFF',
      foreColor: '#000000',
      listItems: [],
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'CheckBox',
    label: 'チェックボックス',
    namePrefix: 'CheckBox',
    icon: CheckSquare,
    defaultWidth: 96,
    defaultHeight: 18,
    defaultProps: () => ({
      caption: 'CheckBox',
      value: false,
      foreColor: '#000000',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'OptionButton',
    label: 'オプションボタン',
    namePrefix: 'OptionButton',
    icon: Circle,
    defaultWidth: 96,
    defaultHeight: 18,
    defaultProps: () => ({
      caption: 'OptionButton',
      value: false,
      foreColor: '#000000',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'ToggleButton',
    label: 'トグルボタン',
    namePrefix: 'ToggleButton',
    icon: ToggleLeft,
    defaultWidth: 72,
    defaultHeight: 24,
    defaultProps: () => ({
      caption: 'ToggleButton',
      value: false,
      backColor: '#F0F0F0',
      foreColor: '#000000',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'Frame',
    label: 'フレーム',
    namePrefix: 'Frame',
    icon: SquareDashed,
    defaultWidth: 144,
    defaultHeight: 96,
    defaultProps: () => ({
      caption: 'Frame',
      backColor: 'transparent',
      foreColor: '#000000',
      borderStyle: 'single',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'Image',
    label: 'イメージ',
    namePrefix: 'Image',
    icon: Image,
    defaultWidth: 72,
    defaultHeight: 72,
    defaultProps: () => ({
      backColor: '#FFFFFF',
      borderStyle: 'single',
      pictureSizeMode: 'clip',
    }),
  },
  {
    type: 'MultiPage',
    label: 'マルチページ',
    namePrefix: 'MultiPage',
    icon: Layers,
    defaultWidth: 192,
    defaultHeight: 144,
    defaultProps: () => ({
      backColor: '#F0F0F0',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'TabStrip',
    label: 'タブストリップ',
    namePrefix: 'TabStrip',
    icon: PanelTop,
    defaultWidth: 192,
    defaultHeight: 144,
    defaultProps: () => ({
      backColor: '#F0F0F0',
      fontSize: 9,
      fontName: 'MS UI Gothic',
    }),
  },
  {
    type: 'ScrollBar',
    label: 'スクロールバー',
    namePrefix: 'ScrollBar',
    icon: MoveVertical,
    defaultWidth: 16,
    defaultHeight: 96,
    defaultProps: () => ({
      backColor: '#E0E0E0',
    }),
  },
  {
    type: 'SpinButton',
    label: 'スピンボタン',
    namePrefix: 'SpinButton',
    icon: ChevronsUpDown,
    defaultWidth: 16,
    defaultHeight: 24,
    defaultProps: () => ({
      backColor: '#F0F0F0',
    }),
  },
]

export const CONTROL_META: Record<ControlType, ControlMeta> = Object.fromEntries(
  CONTROL_CATALOG.map((m) => [m.type, m]),
) as Record<ControlType, ControlMeta>
