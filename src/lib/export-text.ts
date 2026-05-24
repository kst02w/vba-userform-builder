/**
 * Generate clipboard-friendly text for pasting into VBE.
 * Two layouts are provided:
 *   - "All": concatenated .frm + .bas content of the whole project
 *   - "FormCode": just the code-behind of one form
 *   - "ModuleCode": just one module's code
 */
import type { Project, UserForm, CodeModule } from '../types/project'
import { buildFrm } from './export-frm'
import { buildBas } from './export-bas'

export function buildClipboardForForm(form: UserForm): string {
  return buildFrm(form)
}

export function buildClipboardForModule(mod: CodeModule): string {
  return buildBas(mod)
}

export function buildClipboardForProject(project: Project): string {
  const blocks: string[] = []
  blocks.push(`' === Project: ${project.name} ===`)
  blocks.push('')
  for (const f of project.forms) {
    blocks.push(`' --- Form: ${f.name} ---`)
    blocks.push(buildFrm(f))
    blocks.push('')
  }
  for (const m of project.modules) {
    blocks.push(`' --- Module: ${m.name} ---`)
    blocks.push(buildBas(m))
    blocks.push('')
  }
  return blocks.join('\r\n')
}
