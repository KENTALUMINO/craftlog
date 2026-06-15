import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-surface)', color: 'var(--cl-text)', fontFamily: 'var(--font-sans), "Hiragino Sans", sans-serif' }}>

      {/* ナビゲーション */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="7" fill="var(--cl-orange)" />
              <path d="M7 20 L13 7 L19 20" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M9.5 16 H16.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="font-bold text-base tracking-wide" style={{ color: 'var(--cl-text)' }}>CraftLog</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--cl-text-sub)' }}>ログイン</Link>
            <Link href="/signup" className="text-sm font-bold px-4 py-2 rounded-lg" style={{ background: 'var(--cl-orange)', color: '#fff' }}>新規登録</Link>
          </div>
        </div>
      </nav>

      {/* ヒーロー */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 px-5 md:px-10" style={{ background: 'var(--cl-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:gap-16">

            {/* 左：テキスト */}
            <div className="md:flex-1 text-center md:text-left mb-16 md:mb-0">
              <p className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: 'var(--cl-orange)' }}>
                建設・リフォーム業向け 現場管理ツール
              </p>
              <h1 className="font-black leading-tight tracking-tight mb-5"
                style={{ fontSize: 'clamp(30px, 5vw, 56px)', color: 'var(--cl-text)' }}>
                職人の仕事を、<br />もっとスマートに。
              </h1>
              <p className="text-sm md:text-base leading-loose mb-8" style={{ color: 'var(--cl-text-sub)' }}>
                報告書・ヒアリング・ブログ更新まで、<br />
                現場帰りのスマホ操作だけで完結。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start md:max-w-sm">
                <Link href="/signup" className="flex-1 py-4 rounded-xl font-bold text-sm text-center"
                  style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                  新規登録する
                </Link>
                <Link href="/login" className="flex-1 py-4 rounded-xl font-bold text-sm text-center"
                  style={{ background: 'var(--cl-surface)', color: 'var(--cl-text-sub)', border: '1px solid var(--cl-border)' }}>
                  ログインする
                </Link>
              </div>
            </div>

            {/* 右：3ステップ */}
            <div className="md:flex-1">
              <div className="flex flex-col w-full max-w-sm mx-auto md:mx-0">

                {[
                  { num: '01', text: '写真を撮って送るだけ', sub: null },
                  { num: '02', text: 'あなた専用のAIが整理', sub: null },
                  { num: '03', text: 'ワンタップで完成', sub: 'HP・ブログ・完工報告書' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-5 py-6">
                      {/* ステップ番号 */}
                      <span className="font-bold tabular-nums flex-shrink-0 leading-none"
                        style={{ fontSize: '13px', color: 'var(--cl-orange)', letterSpacing: '0.05em', marginTop: '4px' }}>
                        {item.num}
                      </span>
                      {/* テキスト */}
                      <div>
                        <p className="font-black leading-snug"
                          style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', color: 'var(--cl-text)' }}>
                          {item.text}
                        </p>
                        {item.sub && (
                          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--cl-text-muted)' }}>
                            {item.sub}
                          </p>
                        )}
                      </div>
                    </div>
                    {i < 2 && (
                      <div style={{ height: '1px', background: 'var(--cl-border)', marginLeft: '36px' }} />
                    )}
                  </div>
                ))}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* お悩み */}
      <section className="py-14 md:py-20 px-5 md:px-10" style={{ background: 'var(--cl-surface)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-center mb-2" style={{ color: 'var(--cl-orange)' }}>PROBLEM</p>
          <h2 className="text-xl md:text-2xl font-black text-center mb-8 md:mb-10" style={{ color: 'var(--cl-text)' }}>こんなお悩み、ありませんか？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {[
              '施工写真の整理・報告書作成に毎回時間がかかる',
              'お客様へのアンケートを取りそびれてしまう',
              'ブログや施工事例の更新が後回しになっている',
              'ホームページを更新したいけど、文章が書けない',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 px-4 py-4 rounded-xl"
                style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)' }}>
                <span className="font-bold flex-shrink-0" style={{ color: 'var(--cl-orange)', fontSize: '13px' }}>✕</span>
                <p className="text-sm" style={{ color: 'var(--cl-text-sub)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 解決策 */}
      <section className="py-14 md:py-20 px-5 md:px-10" style={{ background: 'var(--cl-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-center mb-2" style={{ color: 'var(--cl-orange)' }}>SOLUTION</p>
          <h2 className="text-xl md:text-2xl font-black text-center mb-2" style={{ color: 'var(--cl-text)' }}>すべて、CraftLogが解決</h2>
          <p className="text-xs md:text-sm text-center mb-10 md:mb-12" style={{ color: 'var(--cl-text-muted)' }}>現場のスマホ操作だけで、事務仕事がまるごと完結。</p>
          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto">
            {[
              {
                label: '完工報告書\n自動生成',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect x="6" y="3" width="22" height="26" rx="3" stroke="var(--cl-orange)" strokeWidth="1.8" fill="none"/>
                    <path d="M11 12 H23" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 16 H23" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 20 H18" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="26" cy="26" r="5.5" fill="var(--cl-orange)"/>
                    <path d="M23.5 26 L25.2 27.8 L28.5 24.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
              {
                label: 'アンケート\n＆口コミ',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <path d="M5 9C5 7.3 6.3 6 8 6H28C29.7 6 31 7.3 31 9V21C31 22.7 29.7 24 28 24H21L18 29L15 24H8C6.3 24 5 22.7 5 21V9Z" stroke="var(--cl-orange)" strokeWidth="1.8" fill="none"/>
                    <path d="M11 14 H25" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M11 18 H20" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
              },
              {
                label: 'AIブログ\n自動生成',
                icon: (
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect x="4" y="9" width="26" height="20" rx="3" stroke="var(--cl-orange)" strokeWidth="1.8" fill="none"/>
                    <path d="M10 17 H26" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 21 H21" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 25 H16" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="28" cy="10" r="5.5" fill="var(--cl-orange)"/>
                    <path d="M25.5 10 L27.2 11.8 L30.5 8.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)' }}>
                  {item.icon}
                </div>
                <p className="text-xs md:text-sm font-bold leading-snug whitespace-pre-line" style={{ color: 'var(--cl-text)' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 選ばれる理由 */}
      <section className="py-14 md:py-20 px-5 md:px-10" style={{ background: 'var(--cl-surface)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-center mb-2" style={{ color: 'var(--cl-orange)' }}>FEATURES</p>
          <h2 className="text-xl md:text-2xl font-black text-center mb-8 md:mb-10" style={{ color: 'var(--cl-text)' }}>選ばれる理由</h2>
          <div className="max-w-3xl mx-auto cl-card divide-y" style={{ borderColor: 'var(--cl-border)' }}>
            {[
              { title: '写真を送るだけ、あとはAIにおまかせ', sub: '黒板の文字を自動読み取り。工程名の手入力がゼロ。' },
              { title: '完工報告書がワンタップで完成', sub: 'PDF自動生成＋メール送信。Excelは不要。' },
              { title: 'アンケートURLをLINEで送るだけ', sub: '回答後にGoogleの口コミへ自動誘導。' },
              { title: 'AIが施工事例・ブログを代わりに書く', sub: '会話形式で入力するだけ。SEO対策済みの記事が完成。' },
              { title: 'ホームページの更新まで、おまかせ', sub: '生成した記事をもとに、こちらでHP更新まで対応。自分で操作する必要はありません。' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 md:gap-4 px-5 md:px-6 py-4 md:py-5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: 'var(--cl-orange-light)' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5 L4 7.5 L8 3" stroke="var(--cl-orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div>
                  <p className="text-sm md:text-base font-bold" style={{ color: 'var(--cl-text)' }}>{item.title}</p>
                  <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--cl-text-muted)' }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-5 md:px-10" style={{ background: 'var(--cl-text)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-black leading-tight mb-4" style={{ fontSize: 'clamp(24px, 5vw, 44px)', color: '#fff' }}>
            職人の仕事を、<br />もっとスマートに。
          </h2>
          <p className="text-sm md:text-base mb-8 leading-loose" style={{ color: 'rgba(255,255,255,0.5)' }}>
            登録は1分。すぐに現場で使い始められます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="px-10 py-4 rounded-xl font-bold text-sm text-center"
              style={{ background: 'var(--cl-orange)', color: '#fff' }}>
              新規登録する
            </Link>
            <Link href="/login" className="px-10 py-4 rounded-xl font-bold text-sm text-center"
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ログインする
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-6 px-5 md:px-10" style={{ background: 'var(--cl-text)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>CraftLog</span>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2025 CraftLog. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
