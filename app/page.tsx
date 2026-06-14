import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-gray-900">CraftLog</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ログイン
            </Link>
            <Link href="/signup" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* ヒーロー */}
      <section className="pt-40 pb-28 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-medium tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-6">
            建設・リフォーム業向け
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-gray-900 mb-6">
            職人の仕事を、<br />もっとスマートに。
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
            施工写真を撮るだけで、完工報告書が自動生成。<br />
            現場の記録が、そのまま会社の資産になる。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="bg-gray-900 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-700 transition-colors">
              無料で始める
            </Link>
            <Link href="/login" className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              ログインする
            </Link>
          </div>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-14">3ステップで完工報告書が完成</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '写真をアップロード', desc: '現場で撮った施工写真をスマホからそのまま登録。黒板の文字をAIが読み取って工程名を自動入力。' },
              { step: '02', title: '工程を並び替え', desc: '施工順にタップして番号を付けるだけ。ドラッグ不要のシンプル操作。' },
              { step: '03', title: 'PDFをメール送信', desc: '写真が工程ごとに整理されたPDFを自動生成。ボタン一つでお客様にメール送信。' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="text-3xl font-bold text-blue-100 mb-4">{item.step}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-14">CraftLogが選ばれる理由</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: '📷', title: 'AIが黒板を自動読み取り', desc: '工程名を手入力する手間がゼロ。黒板を撮るだけで工程が自動分類される。' },
              { icon: '📄', title: 'プロ品質のPDFを自動生成', desc: '写真が工程順に整理されたPDFが数秒で完成。手作業のExcel編集は不要。' },
              { icon: '✉️', title: 'そのままメール送信', desc: '生成したPDFをボタン一つでお客様へ送付。報告書作成の時間を大幅削減。' },
              { icon: '🏗️', title: '現場の記録が会社の資産に', desc: '案件ごとに施工写真が蓄積。施工事例・ブログへの自動展開にも対応予定。' },
            ].map((item) => (
              <div key={item.title} className="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="text-2xl mt-0.5">{item.icon}</div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-900 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">まず使ってみてください</h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            登録は1分。クレジットカード不要。<br />
            現場でそのまま使えます。
          </p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 px-10 py-3.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            無料で始める →
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">© 2025 CraftLog</p>
      </footer>

    </div>
  )
}
