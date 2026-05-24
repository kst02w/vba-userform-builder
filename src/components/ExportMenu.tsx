import { useEffect, useRef, useState } from 'react'
import {
  Download,
  ChevronDown,
  FileArchive,
  ClipboardCopy,
  FileCode2,
  FormInput as FormIcon,
  Check,
  PackageOpen,
} from 'lucide-react'
import JSZip from 'jszip'
import { useProjectStore, selectActiveForm } from '../store/project'
import { buildFrmBytes, buildFrx } from '../lib/export-frm'
import { buildBas, basFileName } from '../lib/export-bas'
import { buildClipboardForProject } from '../lib/export-text'
import { buildInstallerVbs, buildInstallerReadme } from '../lib/export-xlsm-installer'
import { cn } from '../lib/utils'

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ExportMenu() {
  const project = useProjectStore((s) => s.project)
  const form = useProjectStore(selectActiveForm)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const exportFrmZip = async () => {
    const zip = new JSZip()
    for (const f of project.forms) {
      zip.file(`${f.name}.frm`, buildFrmBytes(f))   // CP932-encoded bytes
      zip.file(`${f.name}.frx`, buildFrx())
    }
    for (const m of project.modules) {
      zip.file(basFileName(m), buildBas(m))
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, `${project.name || 'VbaProject'}.zip`)
    setOpen(false)
  }

  const exportInstallerZip = async () => {
    const zip = new JSZip()
    for (const f of project.forms) {
      zip.file(`${f.name}.frm`, buildFrmBytes(f))   // CP932-encoded bytes
      zip.file(`${f.name}.frx`, buildFrx())
    }
    for (const m of project.modules) {
      zip.file(basFileName(m), buildBas(m))
    }
    zip.file('install.vbs', buildInstallerVbs(project))
    zip.file('README.txt', buildInstallerReadme(project))
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, `${project.name || 'VbaProject'}-installer.zip`)
    setOpen(false)
  }

  const exportActiveFrm = () => {
    if (!form) return
    // buildFrmBytes returns CP932-encoded Uint8Array so VBE reads Japanese correctly
    downloadBlob(new Blob([buildFrmBytes(form)], { type: 'application/octet-stream' }), `${form.name}.frm`)
    downloadBlob(new Blob([buildFrx()], { type: 'application/octet-stream' }), `${form.name}.frx`)
    setOpen(false)
  }

  const exportActiveBas = () => {
    // exports first standard module if present; otherwise active form's code-only
    const mod = project.modules[0]
    if (mod) {
      downloadBlob(new Blob([buildBas(mod)], { type: 'text/plain' }), basFileName(mod))
    } else if (form) {
      // Wrap form code as a temporary module for users who just want the code text
      downloadBlob(
        new Blob([`Attribute VB_Name = "${form.name}_Code"\r\n${form.code}`], { type: 'text/plain' }),
        `${form.name}_Code.bas`,
      )
    }
    setOpen(false)
  }

  const copyAllToClipboard = async () => {
    const text = buildClipboardForProject(project)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.warn('Clipboard failed, falling back to download', e)
      downloadBlob(new Blob([text], { type: 'text/plain' }), `${project.name}.txt`)
    }
  }

  const hasForm = !!form
  const disabled = project.forms.length === 0 && project.modules.length === 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-300"
      >
        <Download className="h-4 w-4" />
        エクスポート
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <MenuItem
            icon={<FileArchive className="h-4 w-4 text-emerald-600" />}
            label="プロジェクト全体 (.zip) — 推奨"
            hint=".frm / .frx / .bas を一括。VBEで手動インポート（最も確実）"
            onClick={exportFrmZip}
          />
          <MenuItem
            icon={<PackageOpen className="h-4 w-4" />}
            label="完成 .xlsm を生成 (Windows + Excel)"
            hint="install.vbs 同梱の .zip。Win11 Smart App Control にブロックされる場合あり"
            onClick={exportInstallerZip}
          />
          <MenuItem
            icon={<FormIcon className="h-4 w-4" />}
            label="アクティブフォーム (.frm + .frx)"
            hint={hasForm ? form?.name : 'フォーム未選択'}
            disabled={!hasForm}
            onClick={exportActiveFrm}
          />
          <MenuItem
            icon={<FileCode2 className="h-4 w-4" />}
            label="モジュール (.bas)"
            hint={project.modules[0]?.name ?? 'コードのみ抽出'}
            onClick={exportActiveBas}
          />
          <div className="my-1 border-t border-slate-100" />
          <MenuItem
            icon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}
            label={copied ? 'コピー完了' : 'コピペテキストをクリップボードへ'}
            hint="VBEに貼り付け用"
            onClick={copyAllToClipboard}
          />
          <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
            ※ .frx は最小プレースホルダ。フォーム保存時にVBEが再生成します。<br />
            ※ install.vbs が Smart App Control でブロックされた場合は「プロジェクト全体 .zip」+ VBE手動インポートをお試しください。
          </p>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
      )}
    >
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <span className="flex-1">
        <span className="block text-xs font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
    </button>
  )
}
