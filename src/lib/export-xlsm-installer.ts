/**
 * Generate a .vbs installer that, when double-clicked on a Windows machine
 * with Excel installed, opens Excel and imports all .frm/.bas files in the
 * same folder into a new .xlsm.
 *
 * This is the "P5" approach to delivering a working .xlsm without having to
 * synthesize a vbaProject.bin client-side (which would require implementing
 * the OLE2/CFBF + MS-OVBA spec).
 */
import type { Project } from '../types/project'

export function buildInstallerVbs(project: Project): string {
  const outName = (project.name || 'VbaProject').replace(/[\\/:*?"<>|]/g, '_')
  return `' VBA UserForm Builder — installer
' Double-click this file to generate ${outName}.xlsm next to the .frm/.bas files.
Option Explicit

Dim fso, here, xl, wb, vbComp, f, files
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)

On Error Resume Next
Set xl = CreateObject("Excel.Application")
If Err.Number <> 0 Then
    MsgBox "Excelが見つかりません。Microsoft Excelをインストールしてください。", vbCritical
    WScript.Quit 1
End If
On Error Goto 0

xl.Visible = True
xl.DisplayAlerts = False
Set wb = xl.Workbooks.Add

' Try to access the VBA project (requires "Trust access to the VBA project object model")
On Error Resume Next
Dim vbe : Set vbe = wb.VBProject
If Err.Number <> 0 Then
    MsgBox "VBE オブジェクト モデルへのアクセスが許可されていません。" & vbCrLf & _
           "Excel: ファイル → オプション → トラスト センター → トラスト センターの設定 → マクロの設定" & vbCrLf & _
           "「VBA プロジェクト オブジェクト モデルへのアクセスを信頼する」をオンにして再実行してください。", vbCritical
    xl.DisplayAlerts = True
    wb.Close False
    xl.Quit
    WScript.Quit 2
End If
On Error Goto 0

' Import all .frm and .bas files in this folder
For Each f In fso.GetFolder(here).Files
    If LCase(fso.GetExtensionName(f.Name)) = "frm" Or _
       LCase(fso.GetExtensionName(f.Name)) = "bas" Or _
       LCase(fso.GetExtensionName(f.Name)) = "cls" Then
        On Error Resume Next
        Set vbComp = wb.VBProject.VBComponents.Import(f.Path)
        If Err.Number <> 0 Then
            MsgBox "インポート失敗: " & f.Name & vbCrLf & Err.Description, vbExclamation
            Err.Clear
        End If
        On Error Goto 0
    End If
Next

' Save as .xlsm
Dim outPath : outPath = fso.BuildPath(here, "${outName}.xlsm")
On Error Resume Next
wb.SaveAs outPath, 52  ' xlOpenXMLWorkbookMacroEnabled
If Err.Number <> 0 Then
    MsgBox "保存に失敗しました: " & Err.Description, vbCritical
End If
On Error Goto 0

xl.DisplayAlerts = True
MsgBox "完了: " & outPath & vbCrLf & "VBE (Alt+F11) でフォームを確認できます。", vbInformation
`
}

export function buildInstallerReadme(project: Project): string {
  return `# ${project.name} — VBA UserForm Builder 出力

============================================================
■ 方法A: install.vbs で自動取り込み（うまく動けば一番ラク）
============================================================
1. このフォルダ内のすべてのファイルを同じ場所に展開してください
2. 「install.vbs」をダブルクリック
3. Excel が起動し、フォーム・モジュールが自動でインポートされます
4. 同じフォルダに ${(project.name || 'VbaProject')}.xlsm が出力されます
5. Alt+F11 で VBE を開いて確認、F5 でフォームを起動できます

【注意】初回実行時、Excel の以下の設定が必要です：
  ファイル → オプション → トラスト センター → トラスト センターの設定
  → マクロの設定 → 「VBA プロジェクト オブジェクト モデルへのアクセスを信頼する」にチェック

============================================================
■ Windows 11 で「Smart App Control がブロックしました」と出た場合
============================================================
これは Windows 11 標準のセキュリティ機能 (SAC) が未知の発行元の
スクリプトをブロックしています。3つの対処法：

(a) 一番確実 → 下の「方法B 手動取り込み」を使う

(b) install.vbs を使う:
    install.vbs を右クリック → プロパティ → 下部「ブロックの解除」
    にチェック → OK → コマンドプロンプトを開いて：
        cscript install.vbs
    (ダブルクリックでなく cscript 経由だと通ることがあります)

(c) Smart App Control をオフにする (※非推奨)
    Windows セキュリティ → アプリとブラウザの制御 → Smart App Control
    → オフ
    注意: SAC は一度オフにすると Windows 再インストールでしか戻せません

============================================================
■ 方法B: 手動で VBE に取り込む（Smart App Control の影響を受けません）
============================================================
1. Excel を開く（新規ブックでOK）
2. Alt+F11 で VBE (Visual Basic Editor) を起動
3. ファイル → ファイルのインポート (Ctrl+M)
4. このフォルダの .frm / .bas / .cls を一つずつ追加
5. Excel に戻って Ctrl+S → ファイルの種類を「Excel マクロ有効ブック (.xlsm)」
   にして保存

============================================================
■ 含まれるファイル
============================================================
forms:
${project.forms.map((f) => `  - ${f.name}.frm + ${f.name}.frx`).join('\n')}
${project.modules.length > 0 ? 'modules:\n' + project.modules.map((m) => `  - ${m.name}.${m.kind === 'class' ? 'cls' : 'bas'}`).join('\n') : ''}
`
}
