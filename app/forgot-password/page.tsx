'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) {
      setError('メールの送信に失敗しました。メールアドレスを確認してください。')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--cl-bg)' }}>
      <div className="w-full max-w-sm">

        {/* ロゴ */}
        <div className="flex items-center gap-2 mb-10">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="6" fill="var(--cl-orange)" />
            <path d="M6 19 L13 7 L20 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M9.5 15 H16.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-bold text-base" style={{ color: 'var(--cl-text)' }}>CraftLog</span>
        </div>

        {sent ? (
          <div className="cl-card p-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--cl-orange-light)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 8 L14 16 L24 8" stroke="var(--cl-orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="4" y="6" width="20" height="16" rx="3" stroke="var(--cl-orange)" strokeWidth="1.8" fill="none"/>
              </svg>
            </div>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--cl-text)' }}>メールを送信しました</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cl-text-muted)' }}>
              {email} にパスワードリセット用のリンクを送りました。メールを確認してください。
            </p>
            <a href="/login" className="text-sm font-medium" style={{ color: 'var(--cl-orange)' }}>
              ログインページへ戻る
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cl-text)' }}>パスワードの再設定</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--cl-text-muted)' }}>
              登録したメールアドレスにリセット用リンクを送ります。
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="cl-label">メールアドレス</label>
                <input type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="cl-input" placeholder="example@mail.com" required
                  style={{ fontSize: '16px' }} />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fff1ed', color: 'var(--cl-orange)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="cl-btn-orange">
                {loading ? '送信中...' : 'リセットリンクを送る'}
              </button>
            </form>

            <p className="text-center text-sm mt-6">
              <a href="/login" className="text-sm" style={{ color: 'var(--cl-text-muted)' }}>
                ← ログインに戻る
              </a>
            </p>
          </>
        )}

      </div>
    </div>
  )
}
