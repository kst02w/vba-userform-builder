import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useProjectStore } from './project'
import { debounce } from '../lib/utils'
import type { Project } from '../types/project'

const STORAGE_KEY = 'vba-userform-builder/project/v1'

export async function loadPersistedProject(): Promise<Project | undefined> {
  try {
    const raw = await idbGet<Project>(STORAGE_KEY)
    if (!raw) return undefined
    // Migration: ensure every form has a code field
    raw.forms = (raw.forms ?? []).map((f) => ({
      ...f,
      code: typeof f.code === 'string' ? f.code : 'Option Explicit\r\n\r\n',
    }))
    if (!raw.view) raw.view = 'designer'
    if (!raw.editorTarget && raw.selectedFormId) {
      raw.editorTarget = { kind: 'form', formId: raw.selectedFormId }
    }
    return raw
  } catch (e) {
    console.warn('Failed to load persisted project', e)
    return undefined
  }
}

const persist = debounce((p: Project) => {
  idbSet(STORAGE_KEY, p).catch((e) => console.warn('Failed to persist project', e))
}, 500)

/** Subscribes the store to IndexedDB. Call once at startup. */
export function attachPersistence(): () => void {
  const unsubscribe = useProjectStore.subscribe((state, prev) => {
    if (state.project === prev.project) return
    persist(state.project)
  })
  return unsubscribe
}
