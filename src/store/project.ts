import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import { useStore } from 'zustand'
import type { TemporalState } from 'zundo'
import type {
  CodeModule,
  ControlBase,
  ControlType,
  EditorTarget,
  Project,
  UserForm,
} from '../types/project'
import { CONTROL_META } from '../lib/controls'
import { clamp, uid } from '../lib/utils'

export type ProjectState = {
  project: Project
}

export type ProjectActions = {
  // project
  loadProject: (project: Project) => void
  renameProject: (name: string) => void

  // form
  addForm: () => string
  deleteForm: (id: string) => void
  renameForm: (id: string, name: string) => void
  selectForm: (id: string | undefined) => void
  updateForm: (id: string, patch: Partial<Omit<UserForm, 'controls' | 'id'>>) => void

  // control
  addControl: (
    formId: string,
    type: ControlType,
    left: number,
    top: number,
  ) => string
  deleteControl: (formId: string, controlId: string) => void
  selectControl: (id: string | undefined) => void
  updateControl: (
    formId: string,
    controlId: string,
    patch: Partial<ControlBase>,
  ) => void
  moveControl: (formId: string, controlId: string, dx: number, dy: number) => void
  setControlRect: (
    formId: string,
    controlId: string,
    rect: { left: number; top: number; width: number; height: number },
  ) => void

  // code-behind & modules
  setFormCode: (formId: string, code: string) => void
  insertFormCode: (formId: string, snippet: string) => void
  addModule: (kind?: 'standard' | 'class', name?: string) => string
  deleteModule: (id: string) => void
  renameModule: (id: string, name: string) => void
  setModuleCode: (id: string, code: string) => void

  // view
  setView: (view: 'designer' | 'code') => void
  setEditorTarget: (target: EditorTarget | undefined) => void
}

export type StoreSlice = ProjectState & ProjectActions

const DEFAULT_FORM_CODE = 'Option Explicit\r\n\r\n'

const DEFAULT_FORM: Omit<UserForm, 'id'> = {
  name: 'UserForm1',
  caption: 'UserForm1',
  width: 360,
  height: 240,
  backColor: '#F0F0F0',
  controls: [],
  code: DEFAULT_FORM_CODE,
}

export const makeInitialProject = (): Project => {
  const formId = uid('frm')
  return {
    id: uid('prj'),
    name: 'MyProject',
    forms: [{ ...DEFAULT_FORM, id: formId }],
    modules: [],
    selectedFormId: formId,
    selectedControlId: undefined,
    view: 'designer',
    editorTarget: { kind: 'form', formId },
  }
}

const nextControlName = (form: UserForm, prefix: string): string => {
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const c of form.controls) {
    const m = c.name.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${max + 1}`
}

const nextFormName = (project: Project): string => {
  let max = 0
  for (const f of project.forms) {
    const m = f.name.match(/^UserForm(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `UserForm${max + 1}`
}

const nextModuleName = (project: Project, prefix: string): string => {
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const m of project.modules) {
    const mm = m.name.match(re)
    if (mm) max = Math.max(max, parseInt(mm[1], 10))
  }
  return `${prefix}${max + 1}`
}

export const useProjectStore = create<StoreSlice>()(
  temporal(
    immer((set) => ({
      project: makeInitialProject(),

      loadProject: (project) =>
        set((state) => {
          state.project = project
        }),

      renameProject: (name) =>
        set((state) => {
          state.project.name = name
        }),

      addForm: () => {
        const id = uid('frm')
        set((state) => {
          const name = nextFormName(state.project)
          state.project.forms.push({
            ...DEFAULT_FORM,
            id,
            name,
            caption: name,
            code: DEFAULT_FORM_CODE,
          })
          state.project.selectedFormId = id
          state.project.selectedControlId = undefined
          state.project.editorTarget = { kind: 'form', formId: id }
        })
        return id
      },

      deleteForm: (id) =>
        set((state) => {
          state.project.forms = state.project.forms.filter((f) => f.id !== id)
          if (state.project.selectedFormId === id) {
            state.project.selectedFormId = state.project.forms[0]?.id
            state.project.selectedControlId = undefined
          }
        }),

      renameForm: (id, name) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === id)
          if (f) {
            f.name = name
            f.caption = name
          }
        }),

      selectForm: (id) =>
        set((state) => {
          state.project.selectedFormId = id
          state.project.selectedControlId = undefined
        }),

      updateForm: (id, patch) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === id)
          if (f) Object.assign(f, patch)
        }),

      addControl: (formId, type, left, top) => {
        const meta = CONTROL_META[type]
        const id = uid('ctl')
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          const name = nextControlName(f, meta.namePrefix)
          const ctrl: ControlBase = {
            id,
            type,
            name,
            left: clamp(Math.round(left), 0, Math.max(0, f.width - meta.defaultWidth)),
            top: clamp(Math.round(top), 0, Math.max(0, f.height - meta.defaultHeight)),
            width: meta.defaultWidth,
            height: meta.defaultHeight,
            enabled: true,
            visible: true,
            tabIndex: f.controls.length,
            tabStop: true,
            ...meta.defaultProps(),
          }
          f.controls.push(ctrl)
          state.project.selectedControlId = id
        })
        return id
      },

      deleteControl: (formId, controlId) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          f.controls = f.controls.filter((c) => c.id !== controlId)
          if (state.project.selectedControlId === controlId)
            state.project.selectedControlId = undefined
        }),

      selectControl: (id) =>
        set((state) => {
          state.project.selectedControlId = id
        }),

      updateControl: (formId, controlId, patch) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          const c = f.controls.find((x) => x.id === controlId)
          if (c) Object.assign(c, patch)
        }),

      moveControl: (formId, controlId, dx, dy) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          const c = f.controls.find((x) => x.id === controlId)
          if (!c) return
          c.left = clamp(Math.round(c.left + dx), 0, Math.max(0, f.width - c.width))
          c.top = clamp(Math.round(c.top + dy), 0, Math.max(0, f.height - c.height))
        }),

      setControlRect: (formId, controlId, rect) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          const c = f.controls.find((x) => x.id === controlId)
          if (!c) return
          const w = clamp(Math.round(rect.width), 8, f.width)
          const h = clamp(Math.round(rect.height), 8, f.height)
          c.width = w
          c.height = h
          c.left = clamp(Math.round(rect.left), 0, f.width - w)
          c.top = clamp(Math.round(rect.top), 0, f.height - h)
        }),

      setFormCode: (formId, code) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (f) f.code = code
        }),

      insertFormCode: (formId, snippet) =>
        set((state) => {
          const f = state.project.forms.find((x) => x.id === formId)
          if (!f) return
          const existing = f.code ?? ''
          if (existing.includes(snippet.trim())) return
          const sep = existing.endsWith('\r\n\r\n') ? '' : existing.endsWith('\r\n') ? '\r\n' : '\r\n\r\n'
          f.code = existing + sep + snippet
        }),

      addModule: (kind = 'standard', name) => {
        const id = uid('mod')
        set((state) => {
          const prefix = kind === 'class' ? 'Class' : 'Module'
          const mname = name ?? nextModuleName(state.project, prefix)
          const mod: CodeModule = {
            id,
            name: mname,
            kind,
            code: 'Option Explicit\r\n\r\n',
          }
          state.project.modules.push(mod)
          state.project.editorTarget = { kind: 'module', moduleId: id }
          state.project.view = 'code'
        })
        return id
      },

      deleteModule: (id) =>
        set((state) => {
          state.project.modules = state.project.modules.filter((m) => m.id !== id)
          if (
            state.project.editorTarget?.kind === 'module' &&
            state.project.editorTarget.moduleId === id
          ) {
            state.project.editorTarget = state.project.selectedFormId
              ? { kind: 'form', formId: state.project.selectedFormId }
              : undefined
          }
        }),

      renameModule: (id, name) =>
        set((state) => {
          const m = state.project.modules.find((x) => x.id === id)
          if (m) m.name = name
        }),

      setModuleCode: (id, code) =>
        set((state) => {
          const m = state.project.modules.find((x) => x.id === id)
          if (m) m.code = code
        }),

      setView: (view) =>
        set((state) => {
          state.project.view = view
        }),

      setEditorTarget: (target) =>
        set((state) => {
          state.project.editorTarget = target
        }),
    })),
    {
      // zundo options: don't track UI-only state changes
      partialize: (state) => ({
        project: {
          ...state.project,
          // exclude selection to avoid undo spamming
          selectedFormId: state.project.selectedFormId,
          selectedControlId: state.project.selectedControlId,
        },
      }),
      equality: (a, b) =>
        JSON.stringify({
          forms: a.project.forms,
          modules: a.project.modules,
          name: a.project.name,
        }) ===
        JSON.stringify({
          forms: b.project.forms,
          modules: b.project.modules,
          name: b.project.name,
        }),
      limit: 100,
    },
  ),
)

/** Hook into the temporal store for undo/redo */
export const useTemporal = <T,>(
  selector: (state: TemporalState<{ project: Project }>) => T,
) => useStore(useProjectStore.temporal, selector)

/** Helpers */
export const selectActiveForm = (state: StoreSlice): UserForm | undefined =>
  state.project.forms.find((f) => f.id === state.project.selectedFormId)

export const selectActiveControl = (state: StoreSlice): ControlBase | undefined => {
  const f = selectActiveForm(state)
  if (!f) return undefined
  return f.controls.find((c) => c.id === state.project.selectedControlId)
}
