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
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
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

    await supabase.from('projects').insert({
      ...form,
      user_id: user.id,
    })

    setForm({ case_name: '', work_type: '', area: '', start_date: '', end_date: '' })
    setShowForm(false)
    setLoading(false)
    fetchProjects()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-900">CraftLog</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{userEmail}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">案件一覧</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
          >
            ＋ 新規案件
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">新規案件を作成</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">現場名 *</label>
                  <input
                    type="text"
                    value={form.case_name}
                    onChange={e => setForm({ ...form, case_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：山田様邸"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">工事種類 *</label>
                  <input
                    type="text"
                    value={form.work_type}
                    onChange={e => setForm({ ...form, work_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：屋根工事"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">地域 *</label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例：平塚市"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">着工日</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">完工日</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? '作成中...' : '作成する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {projects.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              案件がまだありません。「＋ 新規案件」から作成してください。
            </div>
          )}
          {projects.map(p => (
            <div key={p.id} onClick={() => router.push(`/project/${p.id}`)} className="bg-white rounded-xl border border-gray-100 px-5 py-4 cursor-pointer hover:border-blue-200 transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{p.case_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.work_type}　{p.area}</p>
                  {p.start_date && (
                    <p className="text-xs text-gray-400 mt-1">{p.start_date} 〜 {p.end_date || '未定'}</p>
                  )}
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-3 py-1">進行中 →</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
