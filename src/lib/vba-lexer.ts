/**
 * Tiny VBA lexer for the preview interpreter.
 * Handles enough syntax to cover the codegen output produced by P4 plus
 * common hand-written patterns (Dim/If/For/With/Set/MsgBox/method calls).
 */

export type TokenType =
  | 'IDENT'
  | 'KEYWORD'
  | 'NUMBER'
  | 'STRING'
  | 'OP'        // operators and delimiters: ( ) , . & + - * / \ ^ = < > <= >= <> :
  | 'COLON'     // statement separator
  | 'NEWLINE'   // logical line break
  | 'EOF'
  | 'COMMENT'

export type Token = {
  type: TokenType
  value: string
  line: number
  col: number
}

export const KEYWORDS = new Set(
  [
    'And', 'As', 'Boolean', 'ByRef', 'ByVal', 'Byte',
    'Call', 'Case', 'Const', 'CStr', 'CInt', 'CLng', 'CDbl', 'CBool',
    'Date', 'Debug', 'Dim', 'Do', 'Double',
    'Each', 'Else', 'ElseIf', 'End', 'Empty', 'Enum', 'Exit',
    'False', 'For', 'Function',
    'GoTo',
    'If', 'In', 'Integer', 'Is',
    'Let', 'Long', 'Loop',
    'Me', 'Mod',
    'New', 'Next', 'Not', 'Nothing', 'Null',
    'Object', 'On', 'Option', 'Or',
    'Preserve', 'Private', 'Public',
    'ReDim', 'Return',
    'Select', 'Set', 'Single', 'Static', 'Step', 'String', 'Sub',
    'Then', 'To', 'True',
    'Until',
    'Variant',
    'Wend', 'While', 'With',
    'Xor',
  ].map((k) => k.toLowerCase()),
)

const SINGLE_CHAR_OPS = new Set(['(', ')', ',', '.', '&', '+', '-', '*', '/', '\\', '^', '='])

export function lex(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let line = 1
  let col = 1
  const src = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const push = (type: TokenType, value: string, startCol: number, startLine: number) => {
    tokens.push({ type, value, line: startLine, col: startCol })
  }

  while (i < src.length) {
    const ch = src[i]
    const startCol = col
    const startLine = line

    // Whitespace
    if (ch === ' ' || ch === '\t') {
      i++
      col++
      continue
    }

    // Line continuation: " _\n" or "_\n"
    if (ch === '_' && (src[i + 1] === '\n' || src[i + 1] === undefined)) {
      // confirm it's at end of a logical token: not part of identifier
      const prev = src[i - 1]
      if (prev === ' ' || prev === '\t' || prev === undefined) {
        i++ // skip _
        if (src[i] === '\n') {
          i++
          line++
          col = 1
        }
        continue
      }
    }

    // Newline
    if (ch === '\n') {
      // Coalesce: don't double-emit
      if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE')
        push('NEWLINE', '\n', startCol, startLine)
      i++
      line++
      col = 1
      continue
    }

    // Comment (single quote OR REM)
    if (ch === "'") {
      // skip to EOL
      while (i < src.length && src[i] !== '\n') {
        i++
        col++
      }
      continue
    }
    if (/[Rr]/.test(ch) && /^Rem(\b|$)/i.test(src.slice(i))) {
      while (i < src.length && src[i] !== '\n') {
        i++
        col++
      }
      continue
    }

    // Colon = statement separator
    if (ch === ':') {
      push('NEWLINE', ':', startCol, startLine)
      i++
      col++
      continue
    }

    // String literal
    if (ch === '"') {
      let value = ''
      i++
      col++
      while (i < src.length) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') {
            value += '"'
            i += 2
            col += 2
          } else {
            i++
            col++
            break
          }
        } else if (src[i] === '\n') {
          throw new LexError('Unterminated string literal', startLine, startCol)
        } else {
          value += src[i]
          i++
          col++
        }
      }
      push('STRING', value, startCol, startLine)
      continue
    }

    // Number (incl. hex &H...)
    if (ch === '&' && (src[i + 1] === 'H' || src[i + 1] === 'h')) {
      let s = '&H'
      i += 2
      col += 2
      while (i < src.length && /[0-9A-Fa-f]/.test(src[i])) {
        s += src[i]
        i++
        col++
      }
      const v = parseInt(s.slice(2), 16)
      push('NUMBER', String(v), startCol, startLine)
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let s = ''
      while (i < src.length && /[0-9]/.test(src[i])) {
        s += src[i]
        i++
        col++
      }
      if (src[i] === '.') {
        s += '.'
        i++
        col++
        while (i < src.length && /[0-9]/.test(src[i])) {
          s += src[i]
          i++
          col++
        }
      }
      // Optional exponent
      if (src[i] === 'e' || src[i] === 'E') {
        s += src[i]
        i++
        col++
        if (src[i] === '+' || src[i] === '-') {
          s += src[i]
          i++
          col++
        }
        while (i < src.length && /[0-9]/.test(src[i])) {
          s += src[i]
          i++
          col++
        }
      }
      // Type suffix
      if (i < src.length && /[#!&%@]/.test(src[i])) {
        i++
        col++
      }
      push('NUMBER', s, startCol, startLine)
      continue
    }

    // Identifier / keyword
    if (/[A-Za-z_]/.test(ch)) {
      let s = ''
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) {
        s += src[i]
        i++
        col++
      }
      const lower = s.toLowerCase()
      if (KEYWORDS.has(lower)) {
        push('KEYWORD', s, startCol, startLine)
      } else {
        push('IDENT', s, startCol, startLine)
      }
      continue
    }

    // Multi-char operators
    if (ch === '<' && src[i + 1] === '=') { push('OP', '<=', startCol, startLine); i += 2; col += 2; continue }
    if (ch === '>' && src[i + 1] === '=') { push('OP', '>=', startCol, startLine); i += 2; col += 2; continue }
    if (ch === '<' && src[i + 1] === '>') { push('OP', '<>', startCol, startLine); i += 2; col += 2; continue }
    if (ch === '<' || ch === '>') {
      push('OP', ch, startCol, startLine); i++; col++; continue
    }

    if (SINGLE_CHAR_OPS.has(ch)) {
      push('OP', ch, startCol, startLine)
      i++
      col++
      continue
    }

    throw new LexError(`Unexpected character: ${JSON.stringify(ch)}`, startLine, startCol)
  }

  // Trailing newline (if not present)
  if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE')
    push('NEWLINE', '\n', col, line)
  push('EOF', '', col, line)

  return tokens
}

export class LexError extends Error {
  line: number
  col: number
  constructor(message: string, line: number, col: number) {
    super(`${message} (line ${line}, col ${col})`)
    this.name = 'LexError'
    this.line = line
    this.col = col
  }
}
