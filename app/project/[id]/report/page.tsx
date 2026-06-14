'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Project = { id: string; case_name: string; work_type: string; area: string; phase_order: string[] | null }

const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      if (proj) setProject(proj)

      const { count } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('project_id', id)
      setPhotoCount(count ?? 0)
    }
    init()
  }, [id])

  const handleSend = async () => {
    if (!project) return
    setGenerating(true)
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

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}/order`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
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
              <div className={`flex items-center gap-1.5 ${i === 2 ? 'text-blue-600' : i < 2 ? 'text-green-500' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 2 ? 'bg-blue-600 text-white' : i < 2 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < 2 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">完工報告書の内容</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">現場名</span>
              <span className="font-medium">{project.case_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">工事種類</span>
              <span className="font-medium">{project.work_type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">地域</span>
              <span className="font-medium">{project.area}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">工程数</span>
              <span className="font-medium">{project.phase_order?.length ?? 0}工程</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">写真枚数</span>
              <span className="font-medium">{photoCount}枚</span>
            </div>
          </div>
        </div>

        {reportSent ? (
          <div className="bg-green-50 text-green-700 rounded-xl py-5 text-center text-sm font-medium mb-4">
            ✓ 完工報告書をメールで送信しました
          </div>
        ) : (
          <button onClick={handleSend} disabled={generating}
            className="w-full bg-gray-900 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-50 mb-4">
            {generating ? '生成中...' : '完工報告書を生成・メール送信'}
          </button>
        )}

        <button onClick={() => router.push(`/project/${id}/interview`)}
          className="w-full bg-indigo-600 text-white rounded-xl py-4 text-sm font-medium">
          次へ：施工事例・ブログを作る →
        </button>
      </main>
    </div>
  )
}
