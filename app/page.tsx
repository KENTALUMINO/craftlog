import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', 'Hiragino Sans', sans-serif" }}>

      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-gray-900 select-none">CraftLog</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              ログイン
            </Link>
            <Link href="/signup" className="text-sm bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium">
              新規登録
            </Link>
          </div>
        </div>
      </nav>

      {/* ヒーロー */}
      <section className="pt-44 pb-32 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-8">
            建設・リフォーム業向け 現場管理ツール
          </p>
          <h1 className="text-6xl font-bold leading-[1.1] tracking-tight text-gray-900 mb-8">
            職人の仕事を、<br />もっとスマートに。
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed mb-12 max-w-lg mx-auto">
            施工写真を撮るだけで、完工報告書が自動生成。
            現場の記録が、そのまま会社の資産になる。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="bg-gray-900 text-white px-8 py-3.5 rounded-md font-medium hover:bg-gray-700 transition-colors text-sm">
              新規登録する
            </Link>
            <Link href="/login" className="text-gray-600 px-8 py-3.5 rounded-md font-medium hover:bg-gray-50 transition-colors text-sm border border-gray-200">
              ログインする
            </Link>
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="max-w-6xl mx-auto px-8">
        <div className="border-t border-gray-100" />
      </div>

      {/* 3ステップ */}
      <section className="py-28 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-4">How it works</p>
            <h2 className="text-3xl font-bold text-gray-900">3ステップで完工報告書が完成</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {[
              {
                num: '1',
                title: '写真をアップロード',
                desc: '現場で撮った施工写真をスマホから登録。黒板の文字をAIが読み取り、工程名を自動入力する。',
              },
              {
                num: '2',
                title: '工程を並び替え',
                desc: '施工順にタップして番号を付けるだけ。シンプルな操作で工程の順序を整理できる。',
              },
              {
                num: '3',
                title: 'PDFをメール送信',
                desc: '写真が工程順に整理されたPDFを自動生成。ボタン一つでお客様へ送付完了。',
              },
            ].map((item) => (
              <div key={item.num} className="bg-white p-10">
                <span className="text-xs font-bold tracking-widest text-gray-300 block mb-6">{item.num.padStart(2, '0')}</span>
                <h3 className="text-base font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 区切り線 */}
      <div className="max-w-6xl mx-auto px-8">
        <div className="border-t border-gray-100" />
      </div>

      {/* 特徴 */}
      <section className="py-28 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-4">Features</p>
            <h2 className="text-3xl font-bold text-gray-900">CraftLogが選ばれる理由</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'AIが黒板を自動読み取り',
                desc: '工程名を手入力する手間がゼロ。現場の黒板を撮るだけで工程が自動分類される。',
              },
              {
                title: 'プロ品質のPDFを自動生成',
                desc: '写真が工程順に整理されたPDFが数秒で完成。手作業のExcel編集は不要。',
              },
              {
                title: 'そのままメール送信',
                desc: '生成したPDFをボタン一つでお客様へ送付。報告書作成にかかる時間を大幅に削減。',
              },
              {
                title: '現場の記録が会社の資産に',
                desc: '案件ごとに施工写真が蓄積される。施工事例・ブログへの自動展開にも対応予定。',
              },
            ].map((item) => (
              <div key={item.title} className="py-8 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-8 bg-gray-950">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-5 leading-tight">
            現場の仕事を、<br />次のステージへ。
          </h2>
          <p className="text-gray-400 mb-12 leading-relaxed">
            登録は1分。すぐに現場で使い始めることができます。
          </p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 px-10 py-3.5 rounded-md font-semibold hover:bg-gray-100 transition-colors text-sm">
            新規登録する
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">CraftLog</span>
          <p className="text-xs text-gray-600">© 2025 CraftLog. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
