'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      return
    }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
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

        {done ? (
          <div className="cl-card p-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--cl-green-light)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 15 L11 20 L22 9" stroke="var(--cl-green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--cl-text)' }}>パスワードを更新しました</h2>
            <p className="text-sm" style={{ color: 'var(--cl-text-muted)' }}>ログインページへ移動します...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--cl-text)' }}>新しいパスワードを設定</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--cl-text-muted)' }}>8文字以上で入力してください。</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="cl-label">新しいパスワード</label>
                <input type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="cl-input" placeholder="••••••••" required
                  style={{ fontSize: '16px' }} />
              </div>
              <div>
                <label className="cl-label">パスワード（確認）</label>
                <input type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="cl-input" placeholder="••••••••" required
                  style={{ fontSize: '16px' }} />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fff1ed', color: 'var(--cl-orange)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="cl-btn-orange">
                {loading ? '更新中...' : 'パスワードを更新する'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
