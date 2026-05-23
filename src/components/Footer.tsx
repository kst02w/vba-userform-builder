import { useProjectStore, selectActiveForm, selectActiveControl } from '../store/project'

export function Footer() {
  const form = useProjectStore(selectActiveForm)
  const ctrl = useProjectStore(selectActiveControl)
  const formsCount = useProjectStore((s) => s.project.forms.length)

  return (
    <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
      <span>
        フォーム: {formsCount} / 選択中: {form?.name ?? 'なし'}
      </span>
      <span>
        {ctrl ? (
          <>
            <span className="font-mono">{ctrl.name}</span>
            {' '}({ctrl.type}) ({ctrl.left}, {ctrl.top}) {ctrl.width}×{ctrl.height}
          </>
        ) : (
          'コントロール未選択'
        )}
      </span>
    </footer>
  )
}
