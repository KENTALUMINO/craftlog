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
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${id}/${Date.now()}_${i}.${ext}`

      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (!error) {
        await supabase.from('photos').insert({
          project_id: id,
          user_id: user.id,
          storage_path: path,
          original_name: file.name,
          phase: null,
        })
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    fetchPhotos()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const groupedPhotos = photos.reduce((acc, photo) => {
    const phase = photo.phase || '未分類'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(photo)
    return acc
  }, {} as Record<string, Photo[]>)

  if (!project) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600">
          ←
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">{project.case_name}</h1>
          <p className="text-xs text-gray-500">{project.work_type}　{project.area}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* アップロードボタン */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white rounded-xl py-5 text-center cursor-pointer hover:bg-blue-700 transition mb-6"
        >
          <p className="text-2xl mb-1">📷</p>
          <p className="font-medium">写真を選んで送信</p>
          <p className="text-xs text-blue-200 mt-1">複数まとめて選択OK</p>
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
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
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
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt={photo.original_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
