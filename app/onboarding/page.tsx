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

    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full">

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">会社情報を設定しましょう</h1>
            <p className="text-sm text-gray-400 mb-6">完工報告書やアンケートに使われます。あとから変更できます。</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">会社名 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：〇〇建設株式会社"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：03-0000-0000"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.company_name.trim()}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-40 transition hover:bg-blue-700"
            >
              次へ →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Google口コミのURLを設定</h1>
            <p className="text-sm text-gray-400 mb-6">
              工事後のアンケート回答時に、お客様をGoogle口コミへ誘導できます。
              Googleビジネスプロフィールの「口コミを書く」リンクを貼り付けてください。
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google口コミURL</label>
              <input
                type="url"
                value={form.google_review_url}
                onChange={e => setForm({ ...form, google_review_url: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://g.page/r/..."
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-8 text-xs text-blue-700 leading-relaxed">
              <strong>URLの取得方法：</strong><br />
              Googleマップで自社を検索 → 「口コミを書く」ボタンを右クリック → 「リンクをコピー」
            </div>

            <button
              onClick={() => handleSave(false)}
              disabled={!form.google_review_url.trim() || saving}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-40 transition hover:bg-blue-700 mb-3"
            >
              {saving ? '保存中...' : '設定して始める'}
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition"
            >
              スキップしてダッシュボードへ
            </button>
          </>
        )}
      </div>
    </div>
  )
}
