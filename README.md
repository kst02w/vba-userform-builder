# VBA UserForm Builder

ブラウザ上で Excel VBA の UserForm を視覚的に作成し、`.frm`/`.frx`/`.xlsm`/`.bas` 形式でダウンロードできるツール。

- **Live**: https://kst02w.github.io/vba-userform-builder/
- **Manual**: [MANUAL.md](MANUAL.md) — 3分クイックスタート、機能ガイド、典型シナリオ、FAQ、トラブルシューティング
- **Stack**: Vite + React + TypeScript + Tailwind CSS v4 + Zustand + dnd-kit + Monaco Editor

## Features

- ハイブリッド作成方式: テンプレ集 / AI（Claude API）/ ゼロから D&D の3起点
- 完全クライアントサイド動作（GitHub Pages 配信、サーバ通信は Anthropic API のみ）
- Monaco エディタによる VBA コード編集（構文ハイライト・補完・イベントスタブ）
- VBA 限定インタプリタによるブラウザ内プレビュー実行
- ワークシート⇔フィールドのマッピング機能（読込元・書込先を指定すると Initialize/Submit のコードを自動生成）
- 出力形式: `.xlsm` インストーラ / `.frm`+`.frx` / `.bas` / コピペテキスト

## Development

```bash
npm install
npm run dev      # http://localhost:5180/vba-userform-builder/
npm run build
```

## Status — v1.0 (all planned phases shipped)

- P1: D&D ビルダー基盤 ✅
- P2: Monaco Editor + イベントスタブ ✅
- P3: `.frm`/`.frx`/`.bas`/コピペ エクスポート ✅
- P4: Excel 読込 + ワークシートマッピング ✅
- P5: `.xlsm` 生成（install.vbs インストーラ方式）✅
- P6: VBA 限定インタプリタ + プレビュー実行 ✅
- P7: Claude API 統合（自然言語＋画像） ✅
- P8: テンプレ集 + ポリッシュ ✅

### エクスポートの注意点
- 「**完成 .xlsm を生成**」: `.zip` に `install.vbs` を同梱。Windows + Excel 環境でダブルクリックすると、Excel が起動して `.frm/.bas` を自動取り込み → `MyProject.xlsm` として保存。初回はトラスト センターで「VBA プロジェクト オブジェクト モデルへのアクセス」を許可する必要あり
- 「**プロジェクト全体 .zip**」: `.frm + .frx + .bas` 単独。VBE「ファイル → ファイルのインポート」で手動取込
- 「**コピペテキスト**」: VBE のコードペインに直接貼り付け
- `.frx` は最小プレースホルダ（8 バイト）。VBE が初回保存時に再生成します

### VBA プレビューインタプリタの制限
- デモ品質: Initialize / Click / Change を実行、変数代入・If・For・With・MsgBox・ Worksheets/Cells/Range・Me.X 系プロパティ操作に対応
- 未対応: Function 戻り値の複雑な利用、On Error、配列、外部 COM、Application オブジェクトの大半

### AI 生成
- Anthropic API キーをユーザー自身が用意（ブラウザ IndexedDB に保存、Anthropic 以外には送信されません）
- claude-opus-4-7 を直接呼び出し（`anthropic-dangerous-direct-browser-access: true`）
- テキスト + 画像（手書きスケッチ等）+ アップロード済み Excel のシート構造を一緒に渡せる
