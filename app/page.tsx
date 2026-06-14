import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', 'Hiragino Sans', sans-serif" }}>

      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">CraftLog</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
              ログイン
            </Link>
            <Link href="/signup" className="text-sm bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              新規登録
            </Link>
          </div>
        </div>
      </nav>

      {/* ヒーロー */}
      <section className="pt-40 pb-24 px-8 bg-gray-50 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 tracking-widest uppercase mb-6">
            建設・リフォーム業向け 現場管理ツール
          </p>
          <h1 className="text-7xl font-black leading-[1.05] tracking-tight text-gray-900 mb-8">
            職人の仕事を、<br />もっとスマートに。
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-12 max-w-xl mx-auto">
            施工写真を撮るだけで、完工報告書が自動生成。<br />
            現場の記録が、そのまま会社の資産になる。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-blue-600 text-white px-10 py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors text-base">
              新規登録する
            </Link>
            <Link href="/login" className="bg-white text-gray-700 px-10 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors text-base border border-gray-200">
              ログインする
            </Link>
          </div>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="py-28 px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold text-blue-600 tracking-widest uppercase mb-4">HOW IT WORKS</p>
          <h2 className="text-5xl font-black text-gray-900 mb-4">3ステップで完成</h2>
          <p className="text-gray-500 mb-16 text-lg">シンプルな操作で、プロ品質の報告書ができあがる。</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: '写真をアップロード',
                desc: '現場で撮った施工写真をスマホから登録。黒板の文字をAIが読み取り、工程名を自動入力。',
                accent: false,
              },
              {
                num: '02',
                title: '工程を並び替え',
                desc: '施工順にタップして番号を付けるだけ。シンプルな操作で工程の順序を整理できる。',
                accent: true,
              },
              {
                num: '03',
                title: 'PDFをメール送信',
                desc: '写真が工程順に整理されたPDFを自動生成。ボタン一つでお客様へ送付完了。',
                accent: false,
              },
            ].map((item) => (
              <div
                key={item.num}
                className="group rounded-2xl p-10 text-center bg-white border border-gray-200 hover:bg-blue-600 hover:border-blue-600 transition-colors duration-200 cursor-default"
              >
                <div className="text-4xl font-black mb-6 text-gray-200 group-hover:text-blue-300 transition-colors duration-200">
                  {item.num}
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 group-hover:text-white transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 group-hover:text-blue-100 transition-colors duration-200">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="py-28 px-8 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold text-blue-600 tracking-widest uppercase mb-4">FEATURES</p>
          <h2 className="text-5xl font-black text-gray-900 mb-4">選ばれる理由</h2>
          <p className="text-gray-500 mb-16 text-lg">現場の職人が、毎日使いたくなるツールを目指して。</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'AIが黒板を自動読み取り',
                desc: '工程名を手入力する手間がゼロ。現場の黒板を撮るだけで工程が自動分類される。',
                accent: false,
              },
              {
                title: 'プロ品質のPDFを自動生成',
                desc: '写真が工程順に整理されたPDFが数秒で完成。手作業のExcel編集は不要。',
                accent: true,
              },
              {
                title: 'そのままメール送信',
                desc: '生成したPDFをボタン一つでお客様へ送付。報告書作成の時間を大幅削減。',
                accent: false,
              },
              {
                title: '現場の記録が会社の資産に',
                desc: '案件ごとに施工写真が蓄積。施工事例やブログへの自動展開にも対応予定。',
                accent: false,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl p-10 text-left bg-gray-50 border border-gray-100 hover:bg-blue-600 hover:border-blue-600 transition-colors duration-200 cursor-default"
              >
                <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-white transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 group-hover:text-blue-100 transition-colors duration-200">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-8 bg-gray-900 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-6xl font-black text-white mb-6 leading-tight">
            現場の仕事を、<br />次のステージへ。
          </h2>
          <p className="text-gray-400 mb-12 text-lg leading-relaxed">
            登録は1分。すぐに現場で使い始めることができます。
          </p>
          <Link href="/signup" className="inline-block bg-blue-600 text-white px-12 py-4 rounded-lg font-bold hover:bg-blue-700 transition-colors text-base">
            新規登録する
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 px-8 bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-gray-500 font-bold">CraftLog</span>
          <p className="text-xs text-gray-600">© 2025 CraftLog. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
