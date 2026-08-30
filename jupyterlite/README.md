# JupyterLite

[![Deploy on kyoz.ai](https://img.shields.io/badge/Deploy%20on-kyoz.ai-172554)](https://my.kyoz.ai/deploy?repo=kyoz-ai/kyozai-examples&ref=main&path=jupyterlite)

## コンテンツを追加するには

`files/`にNotebookやdata fileをsub directoryごと置くと、初期contentsとして受講者へ配布され、Notebookは教員ダッシュボードの列にも自動で並びます。既にJupyterLiteを開いたことのある受講者には、新しい初期contentsは配布されません。

## 教員ダッシュボードをカスタマイズするには

教員画面は`site/`の`dashboard.html`、`dashboard.js`、`dashboard.css`で、`dashboard.js`が[Platform API](https://docs.kyoz.ai/reference/platform-api)の`/_kyozai/capabilities/course/learners`と`/_kyozai/capabilities/database/sql`を`fetch`し、`hooks.js`が保存時に`notebook_progress` tableへ記録した値を表示しています。表示する項目を変えるには`hooks.js`と`migrations/`のtable定義も合わせて変更し、HTMLにはinline scriptを書かず別fileにします。
