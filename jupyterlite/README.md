# JupyterLite

[![Deploy on kyoz.ai](https://img.shields.io/badge/Deploy%20on-kyoz.ai-172554)](https://my.kyoz.ai/deploy?repo=kyoz-ai/kyozai-examples&ref=main&path=jupyterlite)

## コンテンツを追加するには

`files/`にNotebookやdata fileをsub directoryごと置くと、初期contentsとして受講者へ配布され、Notebookは教員ダッシュボードの列にも自動で並びます。既にJupyterLiteを開いたことのある受講者には、新しい初期contentsは配布されません。

## エラー時のアドバイスを変えるには

cellの実行がエラーになると、`hooks.js`が`site/advice.js`の候補を[Decision](https://docs.kyoz.ai/reference/platform-api#decision)へ渡し、判断モデルが選んだ候補の`text`をcellの下に表示します。モデルは文章を生成しないため、受講者が見る文は教員が`site/advice.js`に書いたものだけです。`criteria`はモデルが選ぶときの説明、`text`は受講者へ見せる文で、`text`が`null`の候補は表示しないことを表します。選ばれた候補の確率が`ADVICE_THRESHOLD`未満の場合も表示しません。選ばれた候補と確率は`cell_executions` tableに記録され、教員ダッシュボードの実行記録に並びます。

モデルにはcellのcodeとエラーに加え、NameErrorではその名前と似た名前を定義しているcellと実行状態を渡し、綴りミス・定義cellの未実行・未定義を区別させています。`03-python-syntax.ipynb`と`04-runtime-errors.ipynb`は、候補ごとに1か所ずつ誤りを入れたcellを直していく教材で、候補を変えたときの動作確認にも使えます。

## 教員ダッシュボードをカスタマイズするには

教員画面は`site/`の`dashboard.html`、`dashboard.js`、`dashboard.css`で、`dashboard.js`が[Platform API](https://docs.kyoz.ai/reference/platform-api)の`/_kyozai/capabilities/course/learners`と`/_kyozai/capabilities/database/sql`を`fetch`し、`hooks.js`が保存時に`notebook_progress` tableへ記録した値を表示しています。表示する項目を変えるには`hooks.js`と`migrations/`のtable定義も合わせて変更し、HTMLにはinline scriptを書かず別fileにします。
