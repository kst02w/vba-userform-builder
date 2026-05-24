/**
 * Generate a .bas (standard module) or .cls (class module) text file.
 */
import type { CodeModule } from '../types/project'

export function buildBas(mod: CodeModule): string {
  const header =
    mod.kind === 'class'
      ? [
          `VERSION 1.0 CLASS`,
          `BEGIN`,
          `  MultiUse = -1  'True`,
          `END`,
          `Attribute VB_Name = "${mod.name}"`,
          `Attribute VB_GlobalNameSpace = False`,
          `Attribute VB_Creatable = False`,
          `Attribute VB_PredeclaredId = False`,
          `Attribute VB_Exposed = False`,
        ].join('\r\n')
      : `Attribute VB_Name = "${mod.name}"`

  const body = (mod.code ?? '').replace(/\r?\n/g, '\r\n')
  return header + '\r\n' + body + (body.endsWith('\r\n') ? '' : '\r\n')
}

export function basFileName(mod: CodeModule): string {
  return mod.name + (mod.kind === 'class' ? '.cls' : '.bas')
}
