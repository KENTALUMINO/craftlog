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
  const [allPhases, setAllPhases] = useState<string[]>([])
  const [ordered, setOrdered] = useState<string[]>([]) // タップした順
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
        setAllPhases(detected)
        // 保存済みの順番があればプリセット
        if (proj?.phase_order && proj.phase_order.length > 0) {
          const saved = (proj.phase_order as string[]).filter(p => detected.includes(p))
          setOrdered(saved)
        }
      }
    }
    init()
  }, [id])

  const handleTap = (phase: string) => {
    if (ordered.includes(phase)) {
      // タップ済みなら解除（それ以降の番号もリセット）
      const idx = ordered.indexOf(phase)
      setOrdered(ordered.slice(0, idx))
    } else {
      setOrdered([...ordered, phase])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('projects').update({ phase_order: ordered }).eq('id', id)
    setSaving(false)
    router.push(`/project/${id}/report`)
  }

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>
  )

  const remaining = allPhases.filter(p => !ordered.includes(p))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}`)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
          <span>←</span><span>前の手順へ</span>
        </button>
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
        <p className="text-sm text-gray-500 mb-5">施工した順番にタップしてください。</p>

        <div className="space-y-2 mb-6">
          {allPhases.map((phase) => {
            const idx = ordered.indexOf(phase)
            const isSelected = idx !== -1
            return (
              <button
                key={phase}
                onClick={() => handleTap(phase)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isSelected ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isSelected ? idx + 1 : ''}
                </span>
                <span className="font-medium text-sm">{phase}</span>
              </button>
            )
          })}
        </div>

        {remaining.length > 0 && (
          <p className="text-xs text-center text-gray-400 mb-4">
            残り{remaining.length}工程をタップしてください
          </p>
        )}

        {ordered.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving || remaining.length > 0}
            className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-40"
          >
            {saving ? '保存中...' : remaining.length > 0 ? `残り${remaining.length}工程あります` : 'この順番で確定して次へ →'}
          </button>
        )}
      </main>
    </div>
  )
}
