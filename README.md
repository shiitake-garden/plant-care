# 超シンプルなテスト用サイト

## 配置
この `simple-test-site/` フォルダ **ごと**、GitHub Pages のユーザーサイト（`ユーザー名.github.io`）の直下へ置いてください。
- 例: `shiitake-garden.github.io/simple-test-site/index.html`

## 使い方
1. `data/test.json` が 200 で開けるかを確認
2. `index.html` を開く（/simple-test-site/ 配下）
3. プルダウンに「レモン / ブルーベリー / シャインマスカット / いちご」等が並び、月でフィルタできれば成功

## よくあるつまずき
- `data/` の場所がずれている → `index.html` と同階層に `data/` が必要
- キャッシュ → ハード再読込（Ctrl+F5）またはクエリ `?v=...` でバイパス
