'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Photo = {
  id: string
  phase: string | null
  storage_path: string
  original_name: string
  url?: string
}

type Project = {
  id: string
  case_name: string
  work_type: string
  area: string
}

export default function ProjectPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)

  // 工程入力モード
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
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (data) {
      const withUrls = await Promise.all(data.map(async (p) => {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(p.storage_path)
        return { ...p, url: urlData.publicUrl }
      }))
      setPhotos(withUrls)

      // 過去の工程名を抽出
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
          project_id: id,
          user_id: user.id,
          storage_path: path,
          original_name: file.name,
          phase: null,
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

    // 各写真を個別にOCRして工程名を自動セット
    setOcrLoading(true)
    const autoDetected: Photo[] = []
    const needsManual: Photo[] = []

    for (const photo of uploaded) {
      if (!photo.url) { needsManual.push(photo); continue }
      try {
        const ocrRes = await fetch('/api/ocr-phase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: photo.url }),
        })
        const ocrData = await ocrRes.json()
        if (ocrData.phase) {
          await supabase.from('photos').update({ phase: ocrData.phase }).eq('id', photo.id)
          autoDetected.push({ ...photo, phase: ocrData.phase })
        } else {
          needsManual.push(photo)
        }
      } catch {
        needsManual.push(photo)
      }
    }

    setOcrLoading(false)

    // 工程名が検出できなかった写真だけ手動入力モードへ
    if (needsManual.length > 0) {
      setPendingPhotos(needsManual)
      setShowPhaseInput(true)
      setPhaseInput('')
    }

    fetchPhotos()
  }

  const handleAssignPhase = async (phase: string) => {
    if (!phase.trim()) return

    await Promise.all(pendingPhotos.map(p =>
      supabase.from('photos').update({ phase }).eq('id', p.id)
    ))

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

  const handleGenerateReport = async () => {
    setGenerating(true)
    setReportSent(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const res = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, userEmail: user.email }),
    })
    setGenerating(false)
    if (res.ok) setReportSent(true)
  }

  const groupedPhotos = photos.reduce((acc, photo) => {
    const phase = photo.phase || '未分類'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(photo)
    return acc
  }, {} as Record<string, Photo[]>)

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">{project.case_name}</h1>
          <p className="text-xs text-gray-500">{project.work_type}　{project.area}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* 工程入力モーダル */}
        {ocrLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl px-8 py-6 text-center">
              <p className="text-sm text-gray-600">🔍 黒板を読み取り中...</p>
            </div>
          </div>
        )}

        {showPhaseInput && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1">工程名を入力</h3>
              <p className="text-xs text-gray-500 mb-4">{pendingPhotos.length}枚の写真に工程名を設定します</p>

              {/* プレビュー */}
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {pendingPhotos.slice(0, 4).map(p => (
                  <div key={p.id} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.url && <img src={p.url} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
                {pendingPhotos.length > 4 && (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-500">
                    +{pendingPhotos.length - 4}
                  </div>
                )}
              </div>

              {/* 過去の工程名 */}
              {pastPhases.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">過去の工程名から選ぶ</p>
                  <div className="flex flex-wrap gap-2">
                    {pastPhases.map(phase => (
                      <button
                        key={phase}
                        onClick={() => handleAssignPhase(phase)}
                        className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 新しい工程名 */}
              {phaseInput && (
                <p className="text-xs text-indigo-500 mb-1">🔍 黒板から自動検出しました。修正もできます。</p>
              )}
              <input
                type="text"
                value={phaseInput}
                onChange={e => setPhaseInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAssignPhase(phaseInput)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                placeholder="例：高圧洗浄、下地補修..."
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPhaseInput(false); fetchPhotos() }}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm"
                >
                  後で設定
                </button>
                <button
                  onClick={() => handleAssignPhase(phaseInput)}
                  disabled={!phaseInput.trim()}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40"
                >
                  設定する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* インタビューボタン */}
        {photos.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => router.push(`/project/${id}/interview`)}
              className="w-full bg-indigo-600 text-white rounded-xl py-4 text-sm font-medium"
            >
              ✨ 施工事例・ブログ記事を作る
            </button>
          </div>
        )}

        {/* 完工報告書ボタン */}
        {photos.length > 0 && (
          <div className="mb-4">
            {reportSent ? (
              <div className="bg-green-50 text-green-700 rounded-xl py-4 text-center text-sm font-medium">
                ✓ 完工報告書をメールで送信しました
              </div>
            ) : (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-50"
              >
                {generating ? '生成中...' : '完工報告書を生成・送信'}
              </button>
            )}
          </div>
        )}

        {/* アップロードボタン */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white rounded-xl py-5 text-center cursor-pointer hover:bg-blue-700 transition mb-6"
        >
          <p className="text-2xl mb-1">📷</p>
          <p className="font-medium">写真を選んで送信</p>
          <p className="text-xs text-blue-200 mt-1">送信後に工程名を入力</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        {uploading && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>アップロード中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* 写真一覧 */}
        {photos.length === 0 && !uploading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            写真がまだありません。上のボタンから送信してください。
          </div>
        )}

        {Object.entries(groupedPhotos).map(([phase, phasePhotos]) => (
          <div key={phase} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${phase === '未分類' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                {phase}
              </span>
              <span className="text-xs text-gray-400">{phasePhotos.length}枚</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {phasePhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group">
                  {photo.url && <img src={photo.url} alt={photo.original_name} className="w-full h-full object-cover" />}
                  <button
                    onClick={() => {
                      if (confirm('この写真を削除しますか？')) handleDeletePhoto(photo)
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
