/**
 * Recursive-descent parser for the subset of VBA the preview interpreter handles.
 */
import { lex } from './vba-lexer'
import type { Token } from './vba-lexer'
import type {
  BinaryOp,
  Expr,
  Module,
  Procedure,
  Stmt,
} from './vba-ast'

export class ParseError extends Error {
  line: number
  col: number
  constructor(message: string, line: number, col: number) {
    super(`${message} (line ${line}, col ${col})`)
    this.name = 'ParseError'
    this.line = line
    this.col = col
  }
}

export function parse(source: string): Module {
  const tokens = lex(source)
  const p = new Parser(tokens)
  return p.parseModule()
}

class Parser {
  pos = 0
  tokens: Token[]
  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  peek(off = 0): Token {
    return this.tokens[this.pos + off] ?? this.tokens[this.tokens.length - 1]
  }
  eat(): Token {
    const t = this.tokens[this.pos]
    this.pos++
    return t
  }
  matchKw(...names: string[]): boolean {
    const t = this.peek()
    if (t.type !== 'KEYWORD') return false
    return names.some((n) => n.toLowerCase() === t.value.toLowerCase())
  }
  consumeKw(...names: string[]): Token {
    if (!this.matchKw(...names)) {
      throw this.err(`expected keyword ${names.join('/')}, got '${this.peek().value}'`)
    }
    return this.eat()
  }
  matchOp(...vals: string[]): boolean {
    const t = this.peek()
    return t.type === 'OP' && vals.includes(t.value)
  }
  consumeOp(val: string): Token {
    if (!this.matchOp(val)) throw this.err(`expected '${val}'`)
    return this.eat()
  }
  skipNewlines(): void {
    while (this.peek().type === 'NEWLINE') this.eat()
  }
  expectNewline(): void {
    const t = this.peek()
    if (t.type === 'NEWLINE' || t.type === 'EOF') {
      if (t.type === 'NEWLINE') this.eat()
      return
    }
    throw this.err(`expected newline, got '${t.value}'`)
  }
  err(msg: string): ParseError {
    const t = this.peek()
    return new ParseError(msg, t.line, t.col)
  }

  parseModule(): Module {
    const dims: Stmt[] = []
    const procedures: Procedure[] = []
    this.skipNewlines()
    while (this.peek().type !== 'EOF') {
      // Attribute lines (Attribute VB_Name = "...") — skip
      if (this.peek().type === 'KEYWORD' && this.peek().value.toLowerCase() === 'option') {
        // Option Explicit etc — skip rest of line
        while (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') this.eat()
        this.skipNewlines()
        continue
      }
      // Attribute X = Y
      if (this.peek().type === 'IDENT' && this.peek().value.toLowerCase() === 'attribute') {
        while (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') this.eat()
        this.skipNewlines()
        continue
      }

      let visibility: 'Public' | 'Private' = 'Public'
      if (this.matchKw('Public', 'Private')) {
        visibility = this.eat().value as 'Public' | 'Private'
      }

      if (this.matchKw('Sub', 'Function')) {
        procedures.push(this.parseProcedure(visibility))
        this.skipNewlines()
        continue
      }
      if (this.matchKw('Dim', 'Const')) {
        dims.push(this.parseStmt())
        this.skipNewlines()
        continue
      }
      // Unknown — skip line
      while (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') this.eat()
      this.skipNewlines()
    }
    return { dims, procedures }
  }

  parseProcedure(visibility: 'Public' | 'Private'): Procedure {
    const kindTok = this.consumeKw('Sub', 'Function')
    const kind = (kindTok.value[0].toUpperCase() + kindTok.value.slice(1).toLowerCase()) as 'Sub' | 'Function'
    const nameTok = this.eat()
    if (nameTok.type !== 'IDENT') throw this.err(`expected procedure name`)
    const params: Procedure['params'] = []
    if (this.matchOp('(')) {
      this.eat()
      while (!this.matchOp(')')) {
        const byRef =
          this.matchKw('ByVal', 'ByRef')
            ? this.eat().value.toLowerCase() === 'byref'
            : true
        const pName = this.eat()
        if (pName.type !== 'IDENT') throw this.err(`expected param name`)
        let asType: string | undefined
        if (this.matchKw('As')) {
          this.eat()
          asType = this.eat().value
        }
        params.push({ name: pName.value, byRef, asType })
        if (this.matchOp(',')) this.eat()
      }
      this.consumeOp(')')
    }
    // optional As <type> for Function
    if (this.matchKw('As')) {
      this.eat()
      this.eat() // skip type name
    }
    this.expectNewline()
    const body = this.parseBlock(['End'])
    this.consumeKw('End')
    this.consumeKw(kind)
    this.expectNewline()
    return { type: kind, visibility, name: nameTok.value, params, body }
  }

  /** Parse statements until one of the terminator keywords is the next token. */
  parseBlock(terminators: string[], optExtras?: string[]): Stmt[] {
    const stmts: Stmt[] = []
    this.skipNewlines()
    while (this.peek().type !== 'EOF') {
      if (this.matchKw(...terminators)) break
      if (optExtras && this.matchKw(...optExtras)) break
      stmts.push(this.parseStmt())
      this.skipNewlines()
    }
    return stmts
  }

  parseStmt(): Stmt {
    const t = this.peek()
    if (t.type === 'KEYWORD') {
      const k = t.value.toLowerCase()
      switch (k) {
        case 'dim':
          return this.parseDim()
        case 'const':
          return this.parseConst()
        case 'set':
          return this.parseSet()
        case 'if':
          return this.parseIf()
        case 'for':
          return this.parseFor()
        case 'do':
          return this.parseDo()
        case 'while':
          return this.parseWhile()
        case 'with':
          return this.parseWith()
        case 'exit':
          return this.parseExit()
        case 'call':
          this.eat()
          return this.parseAssignOrCall()
      }
    }
    return this.parseAssignOrCall()
  }

  parseDim(): Stmt {
    this.consumeKw('Dim')
    const names: { name: string; asType?: string }[] = []
    while (true) {
      const id = this.eat()
      if (id.type !== 'IDENT') throw this.err(`expected variable name`)
      let asType: string | undefined
      if (this.matchKw('As')) {
        this.eat()
        // type can be qualified like "MSForms.ReturnInteger"
        const typeName = this.eat().value
        let full = typeName
        while (this.matchOp('.')) {
          this.eat()
          full += '.' + this.eat().value
        }
        asType = full
      }
      names.push({ name: id.value, asType })
      if (this.matchOp(',')) {
        this.eat()
        continue
      }
      break
    }
    this.expectNewline()
    return { type: 'Dim', names }
  }

  parseConst(): Stmt {
    this.consumeKw('Const')
    const id = this.eat()
    if (id.type !== 'IDENT') throw this.err(`expected const name`)
    if (this.matchKw('As')) {
      this.eat()
      this.eat()
    }
    this.consumeOp('=')
    const expr = this.parseExpr()
    this.expectNewline()
    return { type: 'Const', name: id.value, expr }
  }

  parseSet(): Stmt {
    this.consumeKw('Set')
    const target = this.parsePostfix()
    this.consumeOp('=')
    const expr = this.parseExpr()
    this.expectNewline()
    return { type: 'Set', target, expr }
  }

  parseIf(): Stmt {
    this.consumeKw('If')
    const cond = this.parseExpr()
    this.consumeKw('Then')
    // Single-line If: "If x Then y" (no newline after Then)
    if (this.peek().type !== 'NEWLINE') {
      const thenStmt = this.parseStmt()
      // optional Else
      const elseifs: { cond: Expr; body: Stmt[] }[] = []
      let elseBody: Stmt[] | undefined
      // Inline parse can't really handle ElseIf here for simplicity; just check Else
      if (this.matchKw('Else')) {
        this.eat()
        elseBody = [this.parseStmt()]
      }
      // Do NOT expect 'End If' for single-line
      return { type: 'If', cond, then: [thenStmt], elseifs, else: elseBody }
    }
    this.expectNewline()
    const thenBody = this.parseBlock(['End', 'ElseIf', 'Else'])
    const elseifs: { cond: Expr; body: Stmt[] }[] = []
    let elseBody: Stmt[] | undefined
    while (this.matchKw('ElseIf')) {
      this.eat()
      const c = this.parseExpr()
      this.consumeKw('Then')
      this.expectNewline()
      const body = this.parseBlock(['End', 'ElseIf', 'Else'])
      elseifs.push({ cond: c, body })
    }
    if (this.matchKw('Else')) {
      this.eat()
      this.expectNewline()
      elseBody = this.parseBlock(['End'])
    }
    this.consumeKw('End')
    this.consumeKw('If')
    this.expectNewline()
    return { type: 'If', cond, then: thenBody, elseifs, else: elseBody }
  }

  parseFor(): Stmt {
    this.consumeKw('For')
    if (this.matchKw('Each')) {
      this.eat()
      const id = this.eat()
      if (id.type !== 'IDENT') throw this.err(`expected loop var`)
      this.consumeKw('In')
      const col = this.parseExpr()
      this.expectNewline()
      const body = this.parseBlock(['Next'])
      this.consumeKw('Next')
      // optional: Next x
      if (this.peek().type === 'IDENT') this.eat()
      this.expectNewline()
      return { type: 'ForEach', varName: id.value, collection: col, body }
    }
    const id = this.eat()
    if (id.type !== 'IDENT') throw this.err(`expected loop var`)
    this.consumeOp('=')
    const from = this.parseExpr()
    this.consumeKw('To')
    const to = this.parseExpr()
    let step: Expr | undefined
    if (this.matchKw('Step')) {
      this.eat()
      step = this.parseExpr()
    }
    this.expectNewline()
    const body = this.parseBlock(['Next'])
    this.consumeKw('Next')
    if (this.peek().type === 'IDENT') this.eat()
    this.expectNewline()
    return { type: 'For', varName: id.value, from, to, step, body }
  }

  parseDo(): Stmt {
    this.consumeKw('Do')
    let whileCond: Expr | undefined
    let untilCond: Expr | undefined
    if (this.matchKw('While')) {
      this.eat()
      whileCond = this.parseExpr()
    } else if (this.matchKw('Until')) {
      this.eat()
      untilCond = this.parseExpr()
    }
    this.expectNewline()
    const body = this.parseBlock(['Loop'])
    this.consumeKw('Loop')
    let postWhile: Expr | undefined
    let postUntil: Expr | undefined
    if (this.matchKw('While')) {
      this.eat()
      postWhile = this.parseExpr()
    } else if (this.matchKw('Until')) {
      this.eat()
      postUntil = this.parseExpr()
    }
    this.expectNewline()
    return { type: 'Do', whileCond, untilCond, body, postWhile, postUntil }
  }

  parseWhile(): Stmt {
    this.consumeKw('While')
    const cond = this.parseExpr()
    this.expectNewline()
    const body = this.parseBlock(['Wend', 'End'])
    if (this.matchKw('Wend')) {
      this.eat()
    } else {
      this.consumeKw('End')
      this.consumeKw('While')
    }
    this.expectNewline()
    return { type: 'While', cond, body }
  }

  parseWith(): Stmt {
    this.consumeKw('With')
    const target = this.parseExpr()
    this.expectNewline()
    const body = this.parseBlock(['End'])
    this.consumeKw('End')
    this.consumeKw('With')
    this.expectNewline()
    return { type: 'With', target, body }
  }

  parseExit(): Stmt {
    this.consumeKw('Exit')
    const k = this.eat()
    if (k.type !== 'KEYWORD') throw this.err(`expected Sub/Function/For/Do after Exit`)
    const kk = k.value.toLowerCase()
    if (!['sub', 'function', 'for', 'do'].includes(kk))
      throw this.err(`unexpected Exit ${k.value}`)
    this.expectNewline()
    const kind = (k.value[0].toUpperCase() + k.value.slice(1).toLowerCase()) as
      | 'Sub' | 'Function' | 'For' | 'Do'
    return { type: 'Exit', kind }
  }

  /** Either an assignment or a procedure call as a statement. */
  parseAssignOrCall(): Stmt {
    // Tentatively parse a postfix expression; if followed by '=' it's an assignment
    const first = this.parsePostfix()
    if (this.matchOp('=')) {
      this.eat()
      const expr = this.parseExpr()
      this.expectNewline()
      return { type: 'Assign', target: first, expr }
    }
    // Implicit-call: collect comma-separated args until newline
    const args: Expr[] = []
    if (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF' && !this.matchKw('Else', 'End', 'ElseIf', 'Loop', 'Wend', 'Next')) {
      args.push(this.parseExpr())
      while (this.matchOp(',')) {
        this.eat()
        // VBA allows omitted args: ","
        if (this.matchOp(',') || this.peek().type === 'NEWLINE') {
          args.push({ type: 'Empty' })
          continue
        }
        args.push(this.parseExpr())
      }
    }
    this.expectNewline()
    if (args.length === 0) return { type: 'CallStmt', expr: first }
    return { type: 'CallStmt', expr: { type: 'Call', target: first, args } }
  }

  // ----- Expression parsing -----
  parseExpr(): Expr {
    return this.parseOr()
  }
  parseOr(): Expr {
    let left = this.parseAnd()
    while (this.matchKw('Or', 'Xor')) {
      const op = this.eat().value as 'Or' | 'Xor'
      const right = this.parseAnd()
      left = { type: 'Binary', op, left, right }
    }
    return left
  }
  parseAnd(): Expr {
    let left = this.parseNot()
    while (this.matchKw('And')) {
      this.eat()
      const right = this.parseNot()
      left = { type: 'Binary', op: 'And', left, right }
    }
    return left
  }
  parseNot(): Expr {
    if (this.matchKw('Not')) {
      this.eat()
      return { type: 'Unary', op: 'Not', expr: this.parseNot() }
    }
    return this.parseCompare()
  }
  parseCompare(): Expr {
    let left = this.parseConcat()
    while (
      this.matchOp('=', '<>', '<', '<=', '>', '>=') ||
      this.matchKw('Is')
    ) {
      const opTok = this.eat()
      const op = opTok.value as BinaryOp
      const right = this.parseConcat()
      left = { type: 'Binary', op, left, right }
    }
    return left
  }
  parseConcat(): Expr {
    let left = this.parseAdd()
    while (this.matchOp('&')) {
      this.eat()
      const right = this.parseAdd()
      left = { type: 'Binary', op: '&', left, right }
    }
    return left
  }
  parseAdd(): Expr {
    let left = this.parseMul()
    while (this.matchOp('+', '-')) {
      const op = this.eat().value as '+' | '-'
      const right = this.parseMul()
      left = { type: 'Binary', op, left, right }
    }
    return left
  }
  parseMul(): Expr {
    let left = this.parseIntDiv()
    while (this.matchOp('*', '/')) {
      const op = this.eat().value as '*' | '/'
      const right = this.parseIntDiv()
      left = { type: 'Binary', op, left, right }
    }
    return left
  }
  parseIntDiv(): Expr {
    let left = this.parseMod()
    while (this.matchOp('\\')) {
      this.eat()
      const right = this.parseMod()
      left = { type: 'Binary', op: '\\', left, right }
    }
    return left
  }
  parseMod(): Expr {
    let left = this.parsePow()
    while (this.matchKw('Mod')) {
      this.eat()
      const right = this.parsePow()
      left = { type: 'Binary', op: 'Mod', left, right }
    }
    return left
  }
  parsePow(): Expr {
    let left = this.parseUnary()
    while (this.matchOp('^')) {
      this.eat()
      const right = this.parseUnary()
      left = { type: 'Binary', op: '^', left, right }
    }
    return left
  }
  parseUnary(): Expr {
    if (this.matchOp('-')) {
      this.eat()
      return { type: 'Unary', op: '-', expr: this.parseUnary() }
    }
    if (this.matchOp('+')) {
      this.eat()
      return { type: 'Unary', op: '+', expr: this.parseUnary() }
    }
    return this.parsePostfix()
  }
  parsePostfix(): Expr {
    let e = this.parsePrimary()
    while (true) {
      if (this.matchOp('.')) {
        this.eat()
        const id = this.eat()
        if (id.type !== 'IDENT' && id.type !== 'KEYWORD')
          throw this.err(`expected member name`)
        e = { type: 'Member', target: e, name: id.value }
      } else if (this.matchOp('(')) {
        this.eat()
        const args: Expr[] = []
        if (!this.matchOp(')')) {
          args.push(this.parseExpr())
          while (this.matchOp(',')) {
            this.eat()
            args.push(this.parseExpr())
          }
        }
        this.consumeOp(')')
        e = { type: 'Call', target: e, args }
      } else {
        break
      }
    }
    return e
  }
  parsePrimary(): Expr {
    const t = this.peek()
    if (t.type === 'NUMBER') {
      this.eat()
      return { type: 'NumLit', value: Number(t.value) }
    }
    if (t.type === 'STRING') {
      this.eat()
      return { type: 'StrLit', value: t.value }
    }
    if (t.type === 'KEYWORD') {
      const k = t.value.toLowerCase()
      if (k === 'true') {
        this.eat()
        return { type: 'BoolLit', value: true }
      }
      if (k === 'false') {
        this.eat()
        return { type: 'BoolLit', value: false }
      }
      if (k === 'nothing') {
        this.eat()
        return { type: 'Nothing' }
      }
      if (k === 'empty') {
        this.eat()
        return { type: 'Empty' }
      }
      if (k === 'null') {
        this.eat()
        return { type: 'Null' }
      }
      if (k === 'me') {
        this.eat()
        return { type: 'Ident', name: 'Me' }
      }
      // CStr / CInt / CLng / CDbl / CBool are recognized as keywords; treat as identifiers for call
      if (['cstr', 'cint', 'clng', 'cdbl', 'cbool'].includes(k)) {
        this.eat()
        return { type: 'Ident', name: t.value }
      }
    }
    if (t.type === 'IDENT') {
      this.eat()
      return { type: 'Ident', name: t.value }
    }
    if (t.type === 'OP' && t.value === '(') {
      this.eat()
      const e = this.parseExpr()
      this.consumeOp(')')
      return e
    }
    throw this.err(`unexpected token '${t.value}'`)
  }
}
