'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Photo = { id: string; phase: string | null; storage_path: string; original_name: string; url?: string }
type Project = { id: string; case_name: string; work_type: string; area: string }

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

export default function ProjectPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([])
  const [showPhaseInput, setShowPhaseInput] = useState(false)
  const [phaseInput, setPhaseInput] = useState('')
  const [pastPhases, setPastPhases] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchProject()
      fetchPhotos()
    }
    init()
  }, [id])

  const fetchProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    if (data) setProject(data)
  }

  const fetchPhotos = async () => {
    const { data } = await supabase.from('photos').select('*').eq('project_id', id).order('created_at', { ascending: true })
    if (data) {
      const withUrls = await Promise.all(data.map(async (p) => {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path)
        return { ...p, url: urlData.publicUrl }
      }))
      setPhotos(withUrls)
      const phases = [...new Set(data.map(p => p.phase).filter(Boolean))] as string[]
      setPastPhases(phases)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress(0)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const uploaded: Photo[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${id}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        const { data: inserted } = await supabase.from('photos').insert({
          project_id: id, user_id: user.id, storage_path: path, original_name: file.name, phase: null,
        }).select().single()
        if (inserted) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
          uploaded.push({ ...inserted, url: urlData.publicUrl })
        }
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''

    setOcrLoading(true)
    const needsManual: Photo[] = []
    for (const photo of uploaded) {
      if (!photo.url) { needsManual.push(photo); continue }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const ocrRes = await fetch('/api/ocr-phase', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: photo.url, userId: user?.id }),
        })
        const ocrData = await ocrRes.json()
        if (ocrData.phase) {
          await supabase.from('photos').update({
            phase: ocrData.phase,
            phase_category: ocrData.category ?? null,
          }).eq('id', photo.id)
        } else {
          needsManual.push(photo)
        }
      } catch { needsManual.push(photo) }
    }
    setOcrLoading(false)
    if (needsManual.length > 0) {
      setPendingPhotos(needsManual)
      setShowPhaseInput(true)
      setPhaseInput('')
    }
    fetchPhotos()
  }

  const handleAssignPhase = async (phase: string) => {
    if (!phase.trim()) return
    await Promise.all(pendingPhotos.map(p => supabase.from('photos').update({ phase }).eq('id', p.id)))
    setShowPhaseInput(false)
    setPendingPhotos([])
    setPhaseInput('')
    fetchPhotos()
  }

  const handleDeletePhoto = async (photo: Photo) => {
    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    fetchPhotos()
  }

  const groupedPhotos = photos.reduce((acc, photo) => {
    const phase = photo.phase || '未分類'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(photo)
    return acc
  }, {} as Record<string, Photo[]>)

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>読み込み中...</div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-bg)' }}>

      {/* ヘッダー */}
      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← 一覧に戻る
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>{project.case_name}</h1>
          <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{project.work_type}　{project.area}</p>
        </div>
      </header>

      <StepBar current={0} />

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* OCR読み取り中オーバーレイ */}
        {ocrLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="cl-card px-8 py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--cl-text-sub)' }}>黒板を読み取り中...</p>
            </div>
          </div>
        )}

        {/* 工程名入力モーダル */}
        {showPhaseInput && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
            <div className="cl-card w-full max-w-md p-6">
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--cl-text)' }}>工程名を入力</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--cl-text-muted)' }}>{pendingPhotos.length}枚の写真に工程名を設定します</p>
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {pendingPhotos.slice(0, 4).map(p => (
                  <div key={p.id} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--cl-bg)' }}>
                    {p.url && <img src={p.url} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
                {pendingPhotos.length > 4 && (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-xs" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>
                    +{pendingPhotos.length - 4}
                  </div>
                )}
              </div>
              {pastPhases.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs mb-2" style={{ color: 'var(--cl-text-muted)' }}>過去の工程名から選ぶ</p>
                  <div className="flex flex-wrap gap-2">
                    {pastPhases.map(phase => (
                      <button key={phase} onClick={() => handleAssignPhase(phase)}
                        className="text-xs rounded-full px-3 py-1.5 transition"
                        style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-sub)', border: '1px solid var(--cl-border)' }}>
                        {phase}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text" value={phaseInput} onChange={e => setPhaseInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAssignPhase(phaseInput)}
                className="cl-input mb-3"
                placeholder="例：高圧洗浄、下地補修..." autoFocus style={{ fontSize: '16px' }}
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowPhaseInput(false); fetchPhotos() }} className="cl-btn-ghost flex-1">後で設定</button>
                <button onClick={() => handleAssignPhase(phaseInput)} disabled={!phaseInput.trim()} className="cl-btn-orange flex-1">設定する</button>
              </div>
            </div>
          </div>
        )}

        {/* アップロードボタン */}
        <div onClick={() => fileInputRef.current?.click()}
          className="rounded-xl py-6 text-center cursor-pointer transition mb-5"
          style={{ background: 'var(--cl-orange)', color: '#fff' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-2">
            <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            <path d="M16 10 v12 M10 16 h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <p className="font-semibold text-sm">写真を選んで送信</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>黒板があれば工程名を自動検出します</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

        {/* アップロード進捗 */}
        {uploading && (
          <div className="cl-card p-4 mb-4">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--cl-text-sub)' }}>
              <span>アップロード中...</span><span>{uploadProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--cl-border)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'var(--cl-orange)' }} />
            </div>
          </div>
        )}

        {/* 空状態 */}
        {photos.length === 0 && !uploading && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--cl-text-muted)' }}>
            写真がまだありません。上のボタンから送信してください。
          </div>
        )}

        {/* 写真グループ */}
        {Object.entries(groupedPhotos).map(([phase, phasePhotos]) => (
          <div key={phase} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-3 py-1 rounded-full font-medium"
                style={phase === '未分類'
                  ? { background: 'var(--cl-orange-light)', color: 'var(--cl-orange)' }
                  : { background: 'var(--cl-green-light)', color: 'var(--cl-green)' }}>
                {phase}
              </span>
              <span className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{phasePhotos.length}枚</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {phasePhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden relative" style={{ background: 'var(--cl-border)' }}>
                  {photo.url && <img src={photo.url} alt={photo.original_name} className="w-full h-full object-cover" />}
                  <button
                    onClick={() => { if (confirm('この写真を削除しますか？')) handleDeletePhoto(photo) }}
                    className="absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 次へ */}
        {photos.length > 0 && (
          <button onClick={() => router.push(`/project/${id}/order`)} className="cl-btn-primary mt-4">
            次へ：工程の順番を確認する →
          </button>
        )}
      </main>
    </div>
  )
}
