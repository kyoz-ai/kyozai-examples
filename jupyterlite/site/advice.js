// 教員が用意するアドバイス。criteriaは判断モデルへ渡す選択基準、textは受講者へ表示する文。
// textがnullの候補は「表示しない」ことを表す。
export const ADVICE_THRESHOLD = 0.5;

export const ADVICE = [
  {
    id: 'undefined-name',
    criteria: '変数や関数の名前が定義されていない。名前の綴りを間違えているか、定義しているcellをまだ実行していない',
    text: '使おうとした名前がまだ定義されていません。綴りが合っているか、その名前を定義しているcellを先に実行したかを確認してください。',
  },
  {
    id: 'syntax',
    criteria: 'Pythonの文法の誤り。括弧や引用符の閉じ忘れ、行末のコロン忘れ、インデントのずれ',
    text: 'Pythonの書き方に誤りがあります。エラーが指している行の括弧や引用符が閉じているか、行末のコロンやインデントが揃っているかを見直してください。',
  },
  {
    id: 'type-mismatch',
    criteria: '文字列と数値など、型の異なる値を組み合わせて計算や比較をしている',
    text: '種類の違う値を一緒に計算しています。CSVから読んだ値は文字列なので、計算する前にint()やfloat()で数値に変換してください。',
  },
  {
    id: 'missing-file',
    criteria: '開こうとしたfileやdirectoryが見つからない。file名やpathの誤り',
    text: 'ファイルが見つかりません。左のファイル一覧で場所と名前を確認し、Notebookからの相対パス（例: data/scores.csv）で指定してください。',
  },
  {
    id: 'missing-key',
    criteria: '辞書やCSVの列名に存在しないkeyを指定している',
    text: '指定した列名やキーが存在しません。CSVの1行目に書かれている列名と、大文字小文字まで一致しているか確認してください。',
  },
  {
    id: 'empty-or-range',
    criteria: 'listや文字列の範囲外のindexを参照している、または空のlistで平均などを計算してゼロ除算している',
    text: 'listが空か、範囲外の位置を参照しています。直前のcellでlistに値が入っているかをprint()で確認してください。',
  },
  {
    id: 'other',
    criteria: '上のどれにも当てはまらない',
    text: null,
  },
];

// 記録済みのadvice_idは候補の変更後も残るため、一覧にない候補は表示しない扱いにする。
export function shownAdvice(adviceId, probability) {
  const advice = ADVICE.find((candidate) => candidate.id === adviceId);
  return advice !== undefined && advice.text !== null && probability >= ADVICE_THRESHOLD
    ? advice.text
    : null;
}
