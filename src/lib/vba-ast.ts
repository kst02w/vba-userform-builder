/**
 * AST node types for the VBA preview interpreter.
 */

export type Expr =
  | { type: 'NumLit'; value: number }
  | { type: 'StrLit'; value: string }
  | { type: 'BoolLit'; value: boolean }
  | { type: 'Nothing' }
  | { type: 'Empty' }
  | { type: 'Null' }
  | { type: 'Ident'; name: string }
  | { type: 'Member'; target: Expr; name: string }
  | { type: 'Call'; target: Expr; args: Expr[] }       // also covers parenthesized index/property access
  | { type: 'Unary'; op: 'Not' | '-' | '+'; expr: Expr }
  | { type: 'Binary'; op: BinaryOp; left: Expr; right: Expr }

export type BinaryOp =
  | '+' | '-' | '*' | '/' | '\\' | 'Mod' | '^' | '&'
  | '=' | '<>' | '<' | '<=' | '>' | '>='
  | 'And' | 'Or' | 'Xor' | 'Is'

export type Stmt =
  | { type: 'Dim'; names: { name: string; asType?: string }[] }
  | { type: 'Set'; target: Expr; expr: Expr }
  | { type: 'Assign'; target: Expr; expr: Expr }
  | { type: 'If'; cond: Expr; then: Stmt[]; elseifs: { cond: Expr; body: Stmt[] }[]; else?: Stmt[] }
  | { type: 'For'; varName: string; from: Expr; to: Expr; step?: Expr; body: Stmt[] }
  | { type: 'ForEach'; varName: string; collection: Expr; body: Stmt[] }
  | { type: 'Do'; whileCond?: Expr; untilCond?: Expr; body: Stmt[]; postWhile?: Expr; postUntil?: Expr }
  | { type: 'While'; cond: Expr; body: Stmt[] }
  | { type: 'With'; target: Expr; body: Stmt[] }
  | { type: 'CallStmt'; expr: Expr }
  | { type: 'Exit'; kind: 'Sub' | 'Function' | 'For' | 'Do' }
  | { type: 'Const'; name: string; expr: Expr }

export type Procedure = {
  type: 'Sub' | 'Function'
  visibility: 'Public' | 'Private'
  name: string
  params: { name: string; byRef: boolean; asType?: string }[]
  body: Stmt[]
}

export type Module = {
  /** Top-level declarations (Dim outside procedures) */
  dims: Stmt[]
  procedures: Procedure[]
}
