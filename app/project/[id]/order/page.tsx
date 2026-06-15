'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Project = { id: string; case_name: string; work_type: string; area: string; phase_order: string[] | null }

const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

const StepBar = ({ current }: { current: number }) => (
  <div style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-3">
    <div className="flex items-center max-w-2xl mx-auto">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i < current ? 'cl-step-done' : i === current ? 'cl-step-active' : 'cl-step-idle'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: i === current ? 'var(--cl-orange)' : i < current ? 'var(--cl-green)' : 'var(--cl-text-muted)' }}>{step}</span>
          </div>
          {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: 'var(--cl-border)' }} />}
        </div>
      ))}
    </div>
  </div>
)

export default function OrderPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [allPhases, setAllPhases] = useState<string[]>([])
  const [ordered, setOrdered] = useState<string[]>([])
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
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>読み込み中...</div>
  )

  const remaining = allPhases.filter(p => !ordered.includes(p))

  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-bg)' }}>

      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}`)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← 前の手順へ
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>{project.case_name}</h1>
          <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{project.work_type}　{project.area}</p>
        </div>
      </header>

      <StepBar current={1} />

      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm mb-5" style={{ color: 'var(--cl-text-sub)' }}>施工した順番にタップしてください。</p>

        <div className="space-y-2 mb-6">
          {[...ordered, ...allPhases.filter(p => !ordered.includes(p))].map((phase) => {
            const idx = ordered.indexOf(phase)
            const isSelected = idx !== -1
            return (
              <button key={phase} onClick={() => handleTap(phase)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                style={isSelected
                  ? { background: 'var(--cl-orange)', border: '1px solid var(--cl-orange)', color: '#fff' }
                  : { background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', color: 'var(--cl-text)' }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={isSelected
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>
                  {isSelected ? idx + 1 : ''}
                </span>
                <span className="font-medium text-sm">{phase}</span>
              </button>
            )
          })}
        </div>

        {remaining.length > 0 && (
          <p className="text-xs text-center mb-4" style={{ color: 'var(--cl-text-muted)' }}>
            残り{remaining.length}工程をタップしてください
          </p>
        )}

        {ordered.length > 0 && (
          <button onClick={handleSave} disabled={saving || remaining.length > 0} className="cl-btn-primary">
            {saving ? '保存中...' : remaining.length > 0 ? `残り${remaining.length}工程あります` : 'この順番で確定して次へ →'}
          </button>
        )}
      </main>
    </div>
  )
}
