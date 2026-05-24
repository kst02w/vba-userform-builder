/**
 * Monaco language definition for VBA (Visual Basic for Applications).
 * Implements a Monarch tokenizer + language configuration suitable for
 * UserForm code-behind and standard modules.
 */
import type * as monaco from 'monaco-editor'

export const VBA_LANGUAGE_ID = 'vba'

export const VBA_KEYWORDS = [
  'AddressOf', 'And', 'As', 'Attribute', 'Boolean', 'ByRef', 'Byte', 'ByVal',
  'Call', 'Case', 'CDate', 'CDbl', 'CInt', 'CLng', 'CSng', 'CStr', 'CVar',
  'Class', 'Class_Initialize', 'Class_Terminate', 'Const', 'Currency',
  'Date', 'Debug', 'Declare', 'Default', 'Dim', 'Do', 'Double',
  'Each', 'Else', 'ElseIf', 'Empty', 'End', 'EndIf', 'Enum', 'Eqv',
  'Erase', 'Error', 'Event', 'Exit',
  'False', 'For', 'Friend', 'Function',
  'Get', 'GoTo', 'Goto',
  'If', 'Imp', 'Implements', 'In', 'Integer', 'Is',
  'LBound', 'Let', 'Lib', 'Like', 'Long', 'Loop', 'LSet',
  'Me', 'Mod',
  'New', 'Next', 'Not', 'Nothing', 'Null',
  'Object', 'On', 'Open', 'Option', 'Optional', 'Or',
  'ParamArray', 'Preserve', 'Print', 'Private', 'Property', 'Public',
  'RaiseEvent', 'ReDim', 'Rem', 'Resume', 'Return', 'RSet',
  'Select', 'Set', 'Single', 'Static', 'Step', 'Stop', 'String', 'Sub',
  'Then', 'To', 'True', 'Type', 'TypeOf',
  'UBound', 'Until',
  'Variant', 'Wend', 'While', 'With', 'WithEvents', 'Xor',
]

export const VBA_BUILTIN_FUNCTIONS = [
  'Abs', 'Array', 'Asc', 'AscB', 'AscW', 'Atn',
  'CBool', 'CByte', 'CCur', 'CDate', 'CDbl', 'CDec', 'Chr', 'ChrB', 'ChrW',
  'CInt', 'CLng', 'Cos', 'CSng', 'CStr', 'CurDir', 'CVar', 'CVDate', 'CVErr',
  'Date', 'DateAdd', 'DateDiff', 'DatePart', 'DateSerial', 'DateValue', 'Day',
  'DDB', 'Dir', 'DoEvents', 'EOF', 'Environ', 'Error', 'Exp', 'FileAttr',
  'FileDateTime', 'FileLen', 'Filter', 'Fix', 'Format', 'FormatCurrency',
  'FormatDateTime', 'FormatNumber', 'FormatPercent', 'FreeFile', 'FV', 'Hex',
  'Hour', 'IIf', 'IMEStatus', 'InputBox', 'InStr', 'InStrB', 'InStrRev', 'Int',
  'IPmt', 'IRR', 'IsArray', 'IsDate', 'IsEmpty', 'IsError', 'IsMissing',
  'IsNull', 'IsNumeric', 'IsObject', 'Join', 'LBound', 'LCase', 'Left',
  'LeftB', 'Len', 'LenB', 'Loc', 'LOF', 'Log', 'LTrim',
  'Mid', 'MidB', 'Minute', 'MIRR', 'Month', 'MonthName', 'MsgBox',
  'Now', 'NPer', 'NPV', 'Oct',
  'Partition', 'Pmt', 'PPmt', 'PV',
  'QBColor',
  'Rate', 'Replace', 'RGB', 'Right', 'RightB', 'Rnd', 'Round', 'RTrim',
  'Second', 'Seek', 'Sgn', 'Shell', 'Sin', 'SLN', 'Space', 'Spc', 'Split',
  'Sqr', 'Str', 'StrComp', 'StrConv', 'String', 'StrReverse', 'Switch', 'SYD',
  'Tab', 'Tan', 'Time', 'Timer', 'TimeSerial', 'TimeValue', 'Trim', 'TypeName',
  'UBound', 'UCase', 'Val', 'VarType',
  'Weekday', 'WeekdayName', 'Year',
]

export const vbaLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: { lineComment: "'" },
  brackets: [
    ['(', ')'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
  folding: {
    markers: {
      start: /^\s*(?:Sub|Function|Property|Type|Enum|If|For|While|Do|With|Select)\b/i,
      end: /^\s*End\s+(?:Sub|Function|Property|Type|Enum|If|With|Select)\b|^\s*(?:Next|Loop|Wend)\b/i,
    },
  },
  wordPattern: /[A-Za-z_][A-Za-z0-9_]*/,
}

export const vbaMonarchLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: true,
  tokenPostfix: '.vba',

  keywords: VBA_KEYWORDS,
  builtins: VBA_BUILTIN_FUNCTIONS,

  operators: [
    '=', '<>', '<', '<=', '>', '>=',
    '+', '-', '*', '/', '\\', '^', '&',
    'And', 'Or', 'Not', 'Xor', 'Mod', 'Eqv', 'Imp', 'Is', 'Like',
  ],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  symbols: /[=><!~?:&|+\-*/^%]+/ as any,

  tokenizer: {
    root: [
      // line continuation
      [/_\s*$/, 'operator'],

      // attribute lines (Attribute VB_Name = ...)
      [/^\s*Attribute\b/i, { token: 'keyword', next: '@attribute' }],

      // single-quote comment
      [/'.*$/, 'comment'],
      // Rem comment
      [/\bRem\b.*$/i, 'comment'],

      // strings
      [/"/, { token: 'string.quote', next: '@string' }],

      // hex / oct / decimal numbers
      [/&H[0-9A-F]+&?/i, 'number.hex'],
      [/&O[0-7]+&?/i, 'number.octal'],
      [/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[#!&%@]?/, 'number'],

      // date literal #1/1/2024#
      [/#[^#\n]*#/, 'string.date'],

      // identifiers / keywords / builtins
      [/[A-Za-z_][A-Za-z0-9_]*/, {
        cases: {
          '@keywords': 'keyword',
          '@builtins': 'predefined',
          '@default': 'identifier',
        },
      }],

      // whitespace
      { include: '@whitespace' },

      // brackets
      [/[()[\]]/, '@brackets'],
      [/[,;.:]/, 'delimiter'],

      // operators
      [/[=<>!&|+\-*/\\^]+/, 'operator'],
    ],

    whitespace: [
      [/\s+/, 'white'],
    ],

    string: [
      [/[^"]+/, 'string'],
      [/""/, 'string.escape'],
      [/"/, { token: 'string.quote', next: '@pop' }],
    ],

    attribute: [
      [/.*$/, 'metatag', '@pop'],
    ],
  },
}
