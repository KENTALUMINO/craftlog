'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Project = { id: string; case_name: string; work_type: string; area: string; phase_order: string[] | null }

const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

export default function OrderPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [phases, setPhases] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      if (proj) setProject(proj)

      const { data: photos } = await supabase.from('photos').select('phase').eq('project_id', id)
      if (photos) {
        const detected = [...new Set(photos.map(p => p.phase).filter(Boolean))] as string[]
        // 保存済みの順番があればそれを使い、新しい工程は末尾に追加
        if (proj?.phase_order && proj.phase_order.length > 0) {
          const saved = proj.phase_order as string[]
          const merged = [...saved.filter((p: string) => detected.includes(p)), ...detected.filter(p => !saved.includes(p))]
          setPhases(merged)
        } else {
          setPhases(detected)
        }
      }
    }
    init()
  }, [id])

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...phases]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setPhases(next)
  }

  const moveDown = (i: number) => {
    if (i === phases.length - 1) return
    const next = [...phases]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    setPhases(next)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('projects').update({ phase_order: phases }).eq('id', id)
    setSaving(false)
    router.push(`/project/${id}/report`)
  }

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div>
          <h1 className="text-base font-bold text-gray-900">{project.case_name}</h1>
          <p className="text-xs text-gray-500">{project.work_type}　{project.area}</p>
        </div>
      </header>

      {/* ステップバー */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center max-w-2xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 ${i === 1 ? 'text-blue-600' : i < 1 ? 'text-green-500' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 1 ? 'bg-blue-600 text-white' : i < 1 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-4">工程を施工順に並べてください。↑↓で順番を変えられます。</p>

        {phases.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">工程がまだ登録されていません。</div>
        )}

        <div className="space-y-2">
          {phases.map((phase, i) => (
            <div key={phase} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-gray-900 font-medium">{phase}</span>
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(i)} disabled={i === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-2 py-0.5 bg-gray-50 rounded">↑</button>
                <button onClick={() => moveDown(i)} disabled={i === phases.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs px-2 py-0.5 bg-gray-50 rounded">↓</button>
              </div>
            </div>
          ))}
        </div>

        {phases.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-medium mt-6 disabled:opacity-50">
            {saving ? '保存中...' : 'この順番で確定して次へ →'}
          </button>
        )}
      </main>
    </div>
  )
}
