import { useState } from 'react'
import { HelpCircle, Keyboard, X } from 'lucide-react'
import { useProjectStore, selectActiveForm, selectActiveControl } from '../store/project'

export function Footer() {
  const form = useProjectStore(selectActiveForm)
  const ctrl = useProjectStore(selectActiveControl)
  const formsCount = useProjectStore((s) => s.project.forms.length)
  const [showHelp, setShowHelp] = useState(false)

  return (
    <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
      <span>
        フォーム: {formsCount} / 選択中: {form?.name ?? 'なし'}
      </span>
      <span className="flex items-center gap-3">
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
        <button
          onClick={() => setShowHelp(true)}
          title="ヘルプ"
          className="flex items-center gap-0.5 rounded p-0.5 hover:bg-slate-100"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </span>
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </footer>
  )
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="h-4 w-4 text-indigo-600" />
            ショートカット & 使い方
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4 text-sm">
          <Group title="ビュー">
            <Row k="F7" v="コードビューへ切替" />
            <Row k="Shift+F7" v="デザイナへ切替" />
          </Group>
          <Group title="デザイナ">
            <Row k="ドラッグ&ドロップ" v="ツールボックスからキャンバスへ配置" />
            <Row k="クリック" v="コントロールを選択" />
            <Row k="↑↓←→" v="選択中コントロールを1pxずつ移動" />
            <Row k="Shift+↑↓←→" v="10pxずつ移動" />
            <Row k="Delete / Backspace" v="選択中コントロールを削除" />
            <Row k="Ctrl+Z / Ctrl+Y" v="元に戻す / やり直し" />
          </Group>
          <Group title="コード">
            <Row k="Ctrl+Space" v="補完候補を表示" />
            <Row k="Me. / コントロール名." v="メンバー補完" />
            <Row k="ホバー" v="コントロール情報をツールチップで表示" />
          </Group>
          <Group title="ワークシート連携">
            <Row k="ワークブック → 選択" v="Excelをアップロードしてシート/列を選択" />
            <Row k="コントロール「データ連携」" v="読込・書込先をマッピング" />
            <Row k="コード再生成" v="Initialize/Submitを自動生成" />
          </Group>
          <Group title="エクスポート">
            <Row k="完成 .xlsm" v="install.vbs同梱の.zip。Windowsでダブルクリック" />
            <Row k=".frm/.frx/.bas" v="VBE 手動インポート用" />
            <Row k="コピペテキスト" v="VBEのコードペインに貼り付け" />
          </Group>
        </div>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <table className="w-full text-xs">
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="w-44 py-0.5 font-mono text-[11px] text-slate-700">{k}</td>
      <td className="py-0.5 text-slate-600">{v}</td>
    </tr>
  )
}
