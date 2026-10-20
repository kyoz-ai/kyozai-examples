// 教員が用意するアドバイス。criteriaは判断モデルへ渡す選択基準、textは受講者へ表示する文。
// textがnullの候補は「表示しない」ことを表す。
export const ADVICE_THRESHOLD = 0.5;

export const ADVICE = [
  {
    id: 'syntax-unclosed',
    criteria: '括弧、角括弧、引用符を閉じ忘れている。SyntaxErrorのwas never closed、unterminated string literal、unexpected EOF while parsing',
    text: '括弧や引用符が閉じていないようです。エラーが指す行とその前の行で、( と )、[ と ]、" と " の数が合っているか数えてみてください。',
  },
  {
    id: 'syntax-missing-colon',
    criteria: 'if、for、while、def、elseなどの行末のコロンを忘れている。SyntaxError: expected \':\'',
    text: 'if や for、def の行は、行末にコロン ( : ) が必要です。エラーが指す行の最後を確認してください。',
  },
  {
    id: 'syntax-indent',
    criteria: 'インデントの誤り。IndentationError。ブロックの字下げ不足、余分な字下げ、スペースとタブの混在',
    text: '字下げ（インデント）が崩れています。if や for の中の行はすべて同じ幅で字下げし、ブロックの外の行は字下げしないようにしてください。',
  },
  {
    id: 'syntax-assign-compare',
    criteria: '条件式で代入の = を使っている。比較の == との取り違え。SyntaxError: invalid syntax. Maybe you meant \'==\'',
    text: '値を比べるときは = ではなく == を使います。if や while の条件の中の = を確認してください。',
  },
  {
    id: 'syntax-fullwidth',
    criteria: '全角スペース、全角括弧、全角の引用符やコロンなど日本語入力の記号が混ざっている。SyntaxError: invalid non-printable character U+3000、invalid character',
    text: '全角の文字が混ざっているようです。日本語入力をオフにして、エラーが指す行のスペースや括弧、引用符を半角で打ち直してください。',
  },
  {
    id: 'syntax-other',
    criteria: '上の分類に当てはまらない文法エラー。SyntaxError: invalid syntax。キーワードの誤り、カンマの不足、演算子の重複など',
    text: 'Pythonの書き方に誤りがあります。エラーが指す行を、教材のお手本と1文字ずつ見比べてみてください。',
  },
  {
    id: 'name-typo',
    criteria: '変数名や関数名の綴りを間違えている。大文字小文字の違い、文字の抜けや入れ替え。Notebook情報に似た名前の定義がある。組み込み関数名の綴りミスも含む',
    text: '使おうとした名前の綴りが、定義した名前や関数名と一致していません。大文字小文字まで含めて、定義した側と使う側の綴りを見比べてください。',
  },
  {
    id: 'name-cell-not-run',
    criteria: '名前を定義しているcellがまだ実行されていない。Notebook情報で、その名前を定義しているcellが未実行になっている。カーネル再起動後に上のcellを実行し直していない',
    text: 'その名前を定義しているcellがまだ実行されていないようです。Notebookは上から順に実行する必要があるので、定義しているcellを先に実行してください。',
  },
  {
    id: 'name-undefined',
    criteria: 'Notebook情報で、その名前も似た名前もどのcellにも定義されていない。使う前に値を代入していない',
    text: '使おうとした名前は、まだどこでも定義されていません。使う前に、その名前に値を代入する行が必要です。',
  },
  {
    id: 'type-str-number',
    criteria: '文字列と数値を混ぜて計算や連結をしている。TypeError: can only concatenate str、unsupported operand type(s)。input()やCSVから読んだ値は文字列のまま',
    text: '文字列と数値を一緒に計算しています。input() や CSV から読んだ値は文字列なので、計算する前に int() や float() で数値に変換してください。逆に print で数値をつなぐなら str() にします。',
  },
  {
    id: 'type-brackets',
    criteria: '括弧の種類を取り違えている。listやdictの要素を()で取り出そうとした、関数を[]で呼び出した。TypeError: object is not subscriptable、object is not callable',
    text: '括弧の使い分けを確認してください。関数を呼ぶときは ( )、listや辞書の要素を取り出すときは [ ] です。',
  },
  {
    id: 'number-as-sequence',
    criteria: '数値をlistや文字列のように扱っている。for文に数値をそのまま渡した、len()に数値を渡した。TypeError: \'int\' object is not iterable、object of type \'int\' has no len()',
    text: '数値を list のように扱っています。回数を指定して繰り返すなら range() を使い、個数を数えるなら len() には list や文字列を渡します。',
  },
  {
    id: 'type-arg-count',
    criteria: '関数に渡す引数の数が定義と合っていない。TypeError: takes N positional arguments but M were given、missing N required positional argument',
    text: '関数に渡している値の数が、定義した引数の数と合っていません。def の行と、呼び出している行の括弧の中を比べてください。',
  },
  {
    id: 'none-result',
    criteria: 'Noneに対して操作している。print()やlist.sort()、append()の戻り値を変数に入れて使っている。\'NoneType\' object has no attribute、\'NoneType\' object is not subscriptable',
    text: '値が None になっています。print() や sort()、append() は結果を返さないので、その戻り値を変数に入れて使うことはできません。元の変数をそのまま使ってください。',
  },
  {
    id: 'attribute-missing',
    criteria: 'メソッド名や属性名の綴りの誤り、またはその型には存在しないメソッドを呼んでいる。AttributeError: object has no attribute。lenght、apend のような綴りミス、listに対するpush',
    text: 'その型には、そのメソッドや属性がありません。変数が本当に想定した型（list、str、dict など）になっているかを type() で確かめ、メソッド名の綴りも確認してください。',
  },
  {
    id: 'value-convert',
    criteria: '数値に変換できない文字列をint()やfloat()に渡している。ValueError: invalid literal for int() with base 10、could not convert string to float',
    text: 'int() や float() に、数値として読めない文字列を渡しています。変換前の値を print() して、空文字や余分な文字が含まれていないか確認してください。',
  },
  {
    id: 'index-range',
    criteria: 'listや文字列の範囲外の位置を参照している。IndexError: list index out of range。indexは0始まり、len()の値をそのままindexに使った、listが空',
    text: 'listの範囲外の位置を参照しています。indexは 0 から始まり、最後は len(list) - 1 です。list の長さを len() で確認してみてください。',
  },
  {
    id: 'key-missing',
    criteria: '辞書やCSVの列名に存在しないキーを指定している。KeyError。列名の綴り、大文字小文字、前後の空白',
    text: '指定したキーや列名が存在しません。辞書なら .keys()、CSV なら1行目の列名を print() して、綴りと大文字小文字を見比べてください。',
  },
  {
    id: 'zero-division',
    criteria: '0で割っている。ZeroDivisionError。空のlistの平均を求めた、分母になる変数が0',
    text: '0 で割ろうとしています。平均を求めるなら、分母になる list が空でないか、割る数が 0 になっていないかを確認してください。',
  },
  {
    id: 'file-not-found',
    criteria: '開こうとしたファイルやフォルダが見つからない。FileNotFoundError。ファイル名、拡張子、フォルダのパスの誤り',
    text: 'ファイルが見つかりません。左のファイル一覧で場所と名前を確認し、Notebookからの相対パス（例: data/scores.csv）で指定してください。',
  },
  {
    id: 'module-not-found',
    criteria: 'importしたモジュールが見つからない。ModuleNotFoundError、ImportError。モジュール名の綴りの誤り、またはこの環境に入っていないライブラリ',
    text: 'そのモジュールは読み込めません。名前の綴りを確認してください。綴りが正しい場合、この演習環境には入っていないライブラリなので、教材で案内している標準ライブラリで進めてください。',
  },
  {
    id: 'interrupted',
    criteria: '実行を途中で中断した。KeyboardInterrupt。無限ループや終わらない処理を停止ボタンで止めた',
    text: '実行を中断しました。終わらない場合は、while の条件が永遠に True のままになっていないか、ループの中で変数を更新しているかを確認してください。',
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
