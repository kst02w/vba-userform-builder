# VBA UserForm Builder

ブラウザ上で Excel VBA の UserForm を視覚的に作成し、`.frm`/`.frx`/`.xlsm`/`.bas` 形式でダウンロードできるツール。

- **Live**: https://kst02w.github.io/vba-userform-builder/
- **Stack**: Vite + React + TypeScript + Tailwind CSS v4 + Zustand + dnd-kit + Monaco Editor

## Features (planned)

- ハイブリッド作成方式: AI（Claude API）で初期生成 → D&D で微調整
- 完全クライアントサイド動作（GitHub Pages 配信）
- VBA 限定インタプリタによるブラウザ内プレビュー実行
- ワークシート⇔フィールドのマッピング機能
- 4種の出力形式: `.frm`+`.frx` / `.xlsm`（テンプレ注入） / `.bas` / コピペテキスト

## Development

```bash
npm install
npm run dev      # http://localhost:5180/vba-userform-builder/
npm run build
```

## Status

P3 完了。P2 Monaco エディタ（VBA 構文ハイライト・コントロール名/プロパティ補完・イベントスタブ生成）と P3 エクスポート（.frm + .frx / .bas / .zip / コピペテキスト）まで実装済み。

- P1: D&D ビルダー基盤 ✅
- P2: Monaco Editor + イベントスタブ ✅
- P3: `.frm`/`.frx`/`.bas`/コピペ エクスポート ✅
- P4: Excel 読込 + ワークシートマッピング
- P5: `.xlsm` テンプレ注入による完成ブック生成
- P6: VBA 限定インタプリタ + プレビュー実行
- P7: Claude API 統合（自然言語/画像/音声/Excel 解析）
- P8: テンプレ集 + ポリッシュ

### エクスポートの注意点
- `.frx` は最小プレースホルダ（8 バイト）。ピクチャ無しのフォームでは VBE が初回保存時にバイナリを再生成します。
- VBE への取り込みは「ファイル」→「ファイルのインポート」または「コピペテキスト」をクリップボード経由で VBE のコードペインに貼り付け。
