'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cl-bg)' }}>

      {/* 左：ブランドパネル */}
      <div className="hidden md:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'var(--cl-text)' }}>
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="var(--cl-orange)" />
            <path d="M7 21 L14 8 L21 21" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M10 17 H18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-bold text-lg tracking-wide" style={{ color: '#fff' }}>CraftLog</span>
        </div>
        <div>
          <p className="text-3xl font-bold leading-snug mb-4" style={{ color: '#fff' }}>
            現場の記録を、<br />もっとスマートに。
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            施工写真の管理から完工報告書の作成まで、<br />職人の仕事をひとつのアプリで完結させます。
          </p>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2025 CraftLog</p>
      </div>

      {/* 右：ログインフォーム */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* モバイル用ロゴ */}
          <div className="flex items-center gap-2 mb-10 md:hidden">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="6" fill="var(--cl-orange)" />
              <path d="M6 19 L13 7 L20 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M9.5 15 H16.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="font-bold text-base" style={{ color: 'var(--cl-text)' }}>CraftLog</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cl-text)' }}>ログイン</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--cl-text-muted)' }}>アカウント情報を入力してください</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="cl-label">メールアドレス</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="cl-input" placeholder="example@mail.com" required
                style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="cl-label">パスワード</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="cl-input" placeholder="••••••••" required
                style={{ fontSize: '16px' }} />
              <div className="flex justify-end mt-1.5">
                <a href="/forgot-password" className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>
                  パスワードをお忘れの方
                </a>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fff1ed', color: 'var(--cl-orange)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="cl-btn-orange" style={{ marginTop: '8px' }}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--cl-text-muted)' }}>
            アカウントをお持ちでない方は{' '}
            <a href="/signup" style={{ color: 'var(--cl-orange)', fontWeight: 600 }}>新規登録</a>
          </p>
        </div>
      </div>
    </div>
  )
}
