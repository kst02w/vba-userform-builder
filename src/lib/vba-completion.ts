/**
 * Monaco completion provider for VBA UserForm code-behind.
 * Provides:
 *   - Control name completion at top level
 *   - Property/method/event completion after "ControlName." or "Me."
 *   - Keyword completion
 */
import type * as monaco from 'monaco-editor'
import type { UserForm } from '../types/project'
import {
  COMMON_CONTROL_METHODS,
  COMMON_CONTROL_PROPERTIES,
  EVENTS_BY_TYPE,
  FORM_EVENTS,
} from './vba-events'
import { VBA_BUILTIN_FUNCTIONS, VBA_KEYWORDS } from './vba-language'

export type CompletionContext = {
  form: UserForm | undefined
}

export function createVbaCompletionProvider(
  monacoNs: typeof monaco,
  getContext: () => CompletionContext,
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', ' '],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const textBefore = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const { form } = getContext()

      const dotMatch = textBefore.match(/([A-Za-z_][A-Za-z0-9_]*)\.[A-Za-z_]*$/)
      if (dotMatch) {
        const owner = dotMatch[1]
        return { suggestions: memberSuggestions(monacoNs, owner, form, range) }
      }

      // Global suggestions
      const suggestions: monaco.languages.CompletionItem[] = []

      // Controls
      if (form) {
        for (const c of form.controls) {
          suggestions.push({
            label: c.name,
            kind: monacoNs.languages.CompletionItemKind.Variable,
            insertText: c.name,
            range,
            detail: `${c.type} (control)`,
            sortText: '0_' + c.name,
          })
        }
      }

      // "Me"
      suggestions.push({
        label: 'Me',
        kind: monacoNs.languages.CompletionItemKind.Keyword,
        insertText: 'Me',
        range,
        detail: 'Current UserForm',
        sortText: '1_Me',
      })

      // Keywords
      for (const kw of VBA_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: monacoNs.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
          sortText: '8_' + kw,
        })
      }

      // Built-ins
      for (const fn of VBA_BUILTIN_FUNCTIONS) {
        suggestions.push({
          label: fn,
          kind: monacoNs.languages.CompletionItemKind.Function,
          insertText: fn,
          range,
          detail: 'VBA built-in',
          sortText: '7_' + fn,
        })
      }

      return { suggestions }
    },
  }
}

function memberSuggestions(
  monacoNs: typeof monaco,
  owner: string,
  form: UserForm | undefined,
  range: monaco.IRange,
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = []

  // Determine target control type
  let controlType: string | undefined
  let isForm = false
  if (owner.toLowerCase() === 'me' || (form && owner === form.name)) {
    isForm = true
  } else {
    const c = form?.controls.find((x) => x.name === owner)
    if (c) controlType = c.type
  }

  if (isForm && form) {
    // Form properties
    for (const p of ['Caption', 'Width', 'Height', 'BackColor', 'StartUpPosition', 'Show', 'Hide', 'Repaint']) {
      suggestions.push({
        label: p,
        kind: p === 'Show' || p === 'Hide' || p === 'Repaint'
          ? monacoNs.languages.CompletionItemKind.Method
          : monacoNs.languages.CompletionItemKind.Property,
        insertText: p,
        range,
        sortText: '0_' + p,
      })
    }
    // Controls accessible via Me.ControlName
    for (const c of form.controls) {
      suggestions.push({
        label: c.name,
        kind: monacoNs.languages.CompletionItemKind.Variable,
        insertText: c.name,
        range,
        detail: c.type,
        sortText: '1_' + c.name,
      })
    }
    return suggestions
  }

  if (controlType) {
    // Common properties
    for (const p of COMMON_CONTROL_PROPERTIES) {
      suggestions.push({
        label: p,
        kind: monacoNs.languages.CompletionItemKind.Property,
        insertText: p,
        range,
        sortText: '0_' + p,
      })
    }
    // Methods
    for (const m of COMMON_CONTROL_METHODS) {
      suggestions.push({
        label: m,
        kind: monacoNs.languages.CompletionItemKind.Method,
        insertText: m,
        range,
        sortText: '1_' + m,
      })
    }
    // Type-specific properties
    if (controlType === 'TextBox' || controlType === 'ComboBox') {
      for (const p of ['MultiLine', 'MaxLength', 'PasswordChar', 'TextAlign', 'SelStart', 'SelLength', 'SelText']) {
        suggestions.push({
          label: p,
          kind: monacoNs.languages.CompletionItemKind.Property,
          insertText: p,
          range,
          sortText: '0_' + p,
        })
      }
    }
    if (controlType === 'ComboBox' || controlType === 'ListBox') {
      for (const p of ['List', 'ListIndex', 'ListCount', 'RowSource', 'ColumnCount', 'BoundColumn']) {
        suggestions.push({
          label: p,
          kind: monacoNs.languages.CompletionItemKind.Property,
          insertText: p,
          range,
          sortText: '0_' + p,
        })
      }
    }
    return suggestions
  }

  return suggestions
}

/**
 * Provides hover information for control names in code.
 */
export function createVbaHoverProvider(
  getContext: () => CompletionContext,
): monaco.languages.HoverProvider {
  return {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      const { form } = getContext()
      if (!form) return null
      const ctrl = form.controls.find((c) => c.name === word.word)
      if (!ctrl) return null
      const events = EVENTS_BY_TYPE[ctrl.type]
      const eventList = events.slice(0, 6).map((e) => `\`${e.name}\``).join(', ')
      return {
        contents: [
          { value: `**${ctrl.name}** *(${ctrl.type})*` },
          { value: `位置: (${ctrl.left}, ${ctrl.top}) / サイズ: ${ctrl.width}×${ctrl.height}` },
          { value: `主なイベント: ${eventList}${events.length > 6 ? ', …' : ''}` },
        ],
      }
    },
  }
}

export { EVENTS_BY_TYPE, FORM_EVENTS }
