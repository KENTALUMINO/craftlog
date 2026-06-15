'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    google_review_url: '',
  })

  const handleSave = async (skip = false) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()

    const payload = {
      company_name: form.company_name,
      phone: form.phone,
      email: user.email,
      google_review_url: skip ? '' : form.google_review_url,
      onboarded: true,
      user_id: user.id,
    }

    if (existing) {
      const { error } = await supabase.from('companies').update(payload).eq('user_id', user.id)
      if (error) { setSaving(false); return }
    } else {
      const { error } = await supabase.from('companies').insert(payload)
      if (error) { setSaving(false); return }
    }

    setSaving(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--cl-bg)' }}>

      {/* 左：ブランドパネル */}
      <div className="hidden md:flex flex-col justify-between w-2/5 p-12" style={{ background: 'var(--cl-text)' }}>
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
            まずは会社情報を<br />設定しましょう。
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            完工報告書やアンケートに使われます。<br />あとからいつでも変更できます。
          </p>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2025 CraftLog</p>
      </div>

      {/* 右：フォーム */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* モバイル用ロゴ */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="6" fill="var(--cl-orange)" />
              <path d="M6 19 L13 7 L20 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M9.5 15 H16.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="font-bold text-base" style={{ color: 'var(--cl-text)' }}>CraftLog</span>
          </div>

          {/* ステップインジケーター */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step > s ? 'cl-step-done' : step === s ? 'cl-step-active' : 'cl-step-idle'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && <div className="flex-1 h-px" style={{ background: 'var(--cl-border)' }} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--cl-text)' }}>会社情報を設定</h1>
              <p className="text-sm mb-7" style={{ color: 'var(--cl-text-muted)' }}>完工報告書やアンケートに使われます。あとから変更できます。</p>

              <div className="space-y-4 mb-7">
                <div>
                  <label className="cl-label">会社名 <span style={{ color: 'var(--cl-orange)' }}>*</span></label>
                  <input type="text" value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    className="cl-input" placeholder="例：〇〇建設株式会社"
                    style={{ fontSize: '16px' }} />
                </div>
                <div>
                  <label className="cl-label">電話番号</label>
                  <input type="tel" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="cl-input" placeholder="例：03-0000-0000"
                    style={{ fontSize: '16px' }} />
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!form.company_name.trim()} className="cl-btn-orange">
                次へ →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--cl-text)' }}>Google口コミのURLを設定</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--cl-text-muted)' }}>
                工事後のアンケート回答時に、お客様をGoogle口コミへ誘導できます。
              </p>

              <div className="mb-4">
                <label className="cl-label">Google口コミURL</label>
                <input type="url" value={form.google_review_url}
                  onChange={e => setForm({ ...form, google_review_url: e.target.value })}
                  className="cl-input" placeholder="https://g.page/r/..."
                  style={{ fontSize: '16px' }} />
              </div>

              <div className="rounded-lg px-4 py-3 mb-7 text-xs leading-relaxed"
                style={{ background: 'var(--cl-orange-light)', color: 'var(--cl-orange-dark)' }}>
                <strong>URLの取得方法：</strong><br />
                Googleマップで自社を検索 → 「口コミを書く」ボタンを右クリック → 「リンクをコピー」
              </div>

              <button onClick={() => handleSave(false)}
                disabled={!form.google_review_url.trim() || saving}
                className="cl-btn-orange mb-3">
                {saving ? '保存中...' : '設定して始める'}
              </button>

              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full text-sm py-2 transition"
                style={{ color: 'var(--cl-text-muted)' }}>
                スキップしてダッシュボードへ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
