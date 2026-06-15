'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Company = {
  id: string
  company_name: string
  phone: string
  address: string
  report_email: string
  google_review_url: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    address: '',
    report_email: '',
    google_review_url: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setCompanyId(data.id)
        setForm({
          company_name: data.company_name ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          report_email: data.report_email ?? '',
          google_review_url: data.google_review_url ?? '',
        })
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (companyId) {
      await supabase.from('companies').update(form).eq('id', companyId)
    } else {
      const { data } = await supabase
        .from('companies')
        .insert({ ...form, user_id: user.id })
        .select()
        .single()
      if (data) setCompanyId(data.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900">会社設定</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">会社情報</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
              <input
                type="text"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：〇〇建設株式会社"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：東京都〇〇区〇〇1-2-3"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Google口コミ</h2>
            <p className="text-xs text-gray-400">アンケート回答後にお客様へ表示するGoogle口コミページのURLを設定してください。</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google口コミURL</label>
              <input
                type="url"
                value={form.google_review_url}
                onChange={e => setForm({ ...form, google_review_url: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://g.page/r/..."
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">完工報告書の送信先</h2>
            <p className="text-xs text-gray-400">完工報告書は登録メールアドレスに必ず届きます。お客様にも送りたい場合はここにメールアドレスを入力してください。</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お客様のメールアドレス（任意）</label>
              <input
                type="email"
                value={form.report_email}
                onChange={e => setForm({ ...form, report_email: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例：customer@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? '保存中...' : '保存する'}
          </button>

          {saved && (
            <p className="text-center text-sm text-green-600">✓ 保存しました</p>
          )}
        </form>
      </main>
    </div>
  )
}
