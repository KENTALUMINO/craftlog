'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Project = {
  id: string
  case_name: string
  work_type: string
  area: string
  start_date: string
  end_date: string
  created_at: string
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    case_name: '',
    work_type: '',
    area: '',
    start_date: '',
    end_date: '',
  })
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const { data: company } = await supabase
        .from('companies')
        .select('onboarded')
        .eq('user_id', user.id)
        .single()
      if (!company || !company.onboarded) {
        router.push('/onboarding')
        return
      }

      fetchProjects()
    }
    init()
  }, [router])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('projects').insert({ ...form, user_id: user.id })
    setForm({ case_name: '', work_type: '', area: '', start_date: '', end_date: '' })
    setShowForm(false)
    setLoading(false)
    fetchProjects()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    // ストレージの写真ファイルを削除
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('project_id', deleteTarget.id)
    if (photos && photos.length > 0) {
      const paths = photos.map(p => p.storage_path)
      await supabase.storage.from('photos').remove(paths)
    }

    // DBの写真レコードを削除
    await supabase.from('photos').delete().eq('project_id', deleteTarget.id)

    // 案件を削除
    await supabase.from('projects').delete().eq('id', deleteTarget.id)

    setDeleting(false)
    setDeleteTarget(null)
    fetchProjects()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const grouped = projects.reduce<Record<string, Project[]>>((acc, p) => {
    const key = p.start_date
      ? `${p.start_date.slice(0, 4)}年${parseInt(p.start_date.slice(5, 7))}月`
      : '日付なし'
    ;(acc[key] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-bg)' }}>

      {/* ヘッダー */}
      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }}
        className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="6" fill="var(--cl-orange)" />
            <path d="M6 19 L13 7 L20 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M9.5 15 H16.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--cl-text)' }}>CraftLog</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{userEmail}</span>
          <button onClick={() => router.push('/settings')}
            className="text-sm transition" style={{ color: 'var(--cl-text-sub)' }}>
            設定
          </button>
          <button onClick={handleLogout}
            className="text-sm transition" style={{ color: 'var(--cl-text-sub)' }}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">

        {/* タイトル行 */}
        <div className="flex justify-between items-center mb-7">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--cl-text)' }}>案件一覧</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cl-text-muted)' }}>{projects.length}件</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="cl-btn-orange"
            style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}
          >
            ＋ 新規案件
          </button>
        </div>

        {/* 新規案件モーダル */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="cl-card w-full max-w-md p-6">
              <h3 className="text-base font-bold mb-5" style={{ color: 'var(--cl-text)' }}>新規案件を作成</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="cl-label">現場名 *</label>
                  <input type="text" value={form.case_name}
                    onChange={e => setForm({ ...form, case_name: e.target.value })}
                    className="cl-input" placeholder="例：山田様邸" required />
                </div>
                <div>
                  <label className="cl-label">工事種類 *</label>
                  <input type="text" value={form.work_type}
                    onChange={e => setForm({ ...form, work_type: e.target.value })}
                    className="cl-input" placeholder="例：屋根工事" required />
                </div>
                <div>
                  <label className="cl-label">地域 *</label>
                  <input type="text" value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                    className="cl-input" placeholder="例：横浜市" required />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="cl-label">着工日</label>
                    <input type="date" value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="cl-input" />
                  </div>
                  <div className="flex-1">
                    <label className="cl-label">完工日</label>
                    <input type="date" value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="cl-input" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="cl-btn-ghost flex-1">
                    キャンセル
                  </button>
                  <button type="submit" disabled={loading} className="cl-btn-orange flex-1">
                    {loading ? '作成中...' : '作成する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="cl-card w-full max-w-sm p-6">
              <h3 className="text-base font-bold mb-2" style={{ color: 'var(--cl-text)' }}>削除しますか？</h3>
              <p className="text-sm mb-1" style={{ color: 'var(--cl-text-sub)' }}>
                <span className="font-semibold">{deleteTarget.case_name}</span> を削除します。
              </p>
              <p className="text-xs mb-6" style={{ color: 'var(--cl-text-muted)' }}>
                この案件に登録されている写真もすべて削除されます。この操作は取り消せません。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="cl-btn-ghost flex-1">
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: '#ef4444', color: '#fff', opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 案件リスト */}
        {projects.length === 0 ? (
          <div className="cl-card flex flex-col items-center justify-center py-16 px-8 text-center">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-5">
              <rect x="8" y="28" width="56" height="38" rx="5" fill="#f0f0f0"/>
              <path d="M2 32 L36 8 L70 32" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <rect x="26" y="42" width="20" height="24" rx="3" fill="#fff" stroke="#e0e0e0" strokeWidth="1.5"/>
              <circle cx="36" cy="52" r="2.5" fill="var(--cl-orange)" opacity="0.7"/>
            </svg>
            <p className="font-semibold mb-1" style={{ color: 'var(--cl-text)' }}>まだ案件がありません</p>
            <p className="text-sm" style={{ color: 'var(--cl-text-muted)' }}>「＋ 新規案件」から最初の案件を作成してください</p>
          </div>
        ) : (
          <div className="space-y-7">
            {Object.entries(grouped).map(([month, list]) => (
              <div key={month}>
                {/* 月ヘッダー */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold" style={{ color: 'var(--cl-text)' }}>{month}</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--cl-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{list.length}件</span>
                </div>

                {/* 案件カード */}
                <div className="space-y-2">
                  {list.map(p => (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/project/${p.id}`)}
                      className="cl-card px-5 py-4 cursor-pointer transition-all duration-150"
                      style={{ borderLeft: '3px solid var(--cl-orange)' }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = 'var(--cl-shadow)'
                        el.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.boxShadow = 'var(--cl-shadow-sm)'
                        el.style.transform = 'translateY(0)'
                      }}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ color: 'var(--cl-text)' }}>{p.case_name}</p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--cl-text-sub)' }}>
                            {p.work_type}　{p.area}
                          </p>
                          {p.start_date && (
                            <p className="text-xs mt-1" style={{ color: 'var(--cl-text-muted)' }}>
                              {p.start_date} 〜 {p.end_date || '未定'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                            style={{ background: 'var(--cl-orange-light)', color: 'var(--cl-orange)' }}>
                            進行中
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(p) }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition"
                            style={{ color: 'var(--cl-text-muted)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--cl-text-muted)' }}
                            title="削除">
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                              <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
