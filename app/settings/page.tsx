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
      const { data } = await supabase.from('companies').select('*').eq('user_id', user.id).single()
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
      const { data } = await supabase.from('companies').insert({ ...form, user_id: user.id }).select().single()
      if (data) setCompanyId(data.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>読み込み中...</div>
  )

  const sections = [
    {
      title: '会社情報',
      fields: [
        { key: 'company_name', label: '会社名', type: 'text', placeholder: '例：〇〇建設株式会社' },
        { key: 'phone', label: '電話番号', type: 'tel', placeholder: '例：03-0000-0000' },
        { key: 'address', label: '住所', type: 'text', placeholder: '例：東京都〇〇区〇〇1-2-3' },
      ],
    },
    {
      title: 'Google口コミ',
      description: 'アンケート回答後にお客様へ表示するGoogle口コミページのURLを設定してください。',
      fields: [
        { key: 'google_review_url', label: 'Google口コミURL', type: 'url', placeholder: 'https://g.page/r/...' },
      ],
    },
    {
      title: '完工報告書の送信先',
      description: '完工報告書は登録メールアドレスに必ず届きます。お客様にも送りたい場合はここに入力してください。',
      fields: [
        { key: 'report_email', label: 'お客様のメールアドレス（任意）', type: 'email', placeholder: '例：customer@example.com' },
      ],
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-bg)' }}>

      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← ダッシュボード
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>会社設定</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="space-y-4">
          {sections.map(section => (
            <div key={section.title} className="cl-card p-5 space-y-4">
              <div>
                <h2 className="cl-label">{section.title}</h2>
                {section.description && (
                  <p className="text-xs mt-1" style={{ color: 'var(--cl-text-muted)' }}>{section.description}</p>
                )}
              </div>
              {section.fields.map(field => (
                <div key={field.key}>
                  <label className="cl-label">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="cl-input"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          ))}

          <button type="submit" disabled={saving} className="cl-btn-primary">
            {saving ? '保存中...' : '保存する'}
          </button>

          {saved && (
            <p className="text-center text-sm font-medium" style={{ color: 'var(--cl-green)' }}>✓ 保存しました</p>
          )}
        </form>
      </main>
    </div>
  )
}
