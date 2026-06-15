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

export default function ReportPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [surveyCopied, setSurveyCopied] = useState(false)

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

  const handleCopySurvey = async () => {
    const surveyUrl = `${window.location.origin}/survey/${id}`
    const message = `この度は工事をご依頼いただきありがとうございました。\nよろしければアンケートへのご回答をお願いいたします。\n\n${surveyUrl}`
    await navigator.clipboard.writeText(message)
    setSurveyCopied(true)
    setTimeout(() => setSurveyCopied(false), 3000)
  }

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
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>読み込み中...</div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--cl-bg)' }}>

      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}/order`)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← 前の手順へ
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>{project.case_name}</h1>
          <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{project.work_type}　{project.area}</p>
        </div>
      </header>

      <StepBar current={2} />

      <main className="max-w-lg mx-auto px-4 py-8">

        {/* 完工報告書の内容 */}
        <div className="cl-card p-5 mb-6">
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--cl-text)' }}>完工報告書の内容</h2>
          <div className="text-sm">
            {[
              { label: '現場名', value: project.case_name },
              { label: '工事種類', value: project.work_type },
              { label: '地域', value: project.area },
              { label: '工程数', value: `${project.phase_order?.length ?? 0}工程` },
              { label: '写真枚数', value: `${photoCount}枚` },
            ].map(({ label, value }, i, arr) => (
              <div key={label} className="flex justify-between py-2.5"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--cl-border)' : 'none' }}>
                <span style={{ color: 'var(--cl-text-muted)' }}>{label}</span>
                <span className="font-medium" style={{ color: 'var(--cl-text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ステップ1：アンケート */}
        <div className="cl-card p-5 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--cl-orange)', color: '#fff' }}>STEP 1</span>
            <p className="text-sm font-bold" style={{ color: 'var(--cl-text)' }}>アンケートをお願いする</p>
          </div>
          <p className="text-xs mb-1" style={{ color: 'var(--cl-text-sub)' }}>
            ボタンを押すとメッセージ＋URLがコピーされます。そのままLINEで送れます。
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--cl-text-muted)' }}>
            ※ すでにお願い済みの場合や不要な場合はスキップしてください。
          </p>
          <button onClick={handleCopySurvey}
            className={surveyCopied ? 'cl-btn-primary' : 'cl-btn-orange'}
            style={surveyCopied ? { background: 'var(--cl-green)' } : {}}>
            {surveyCopied ? '✓ コピーしました' : 'アンケート文章をコピー'}
          </button>
        </div>

        {/* ステップ2：完工報告書 */}
        <div className="cl-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--cl-orange)', color: '#fff' }}>STEP 2</span>
            <p className="text-sm font-bold" style={{ color: 'var(--cl-text)' }}>完工報告書を送る</p>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--cl-text-sub)' }}>
            PDFを生成して登録メールアドレスに送信します。
          </p>
          {reportSent ? (
            <div className="rounded-xl py-4 text-center text-sm font-medium"
              style={{ background: 'var(--cl-green-light)', color: 'var(--cl-green)' }}>
              ✓ 完工報告書をメールで送信しました
            </div>
          ) : (
            <button onClick={handleSend} disabled={generating} className="cl-btn-orange">
              {generating ? '生成中...' : '完工報告書を生成・メール送信'}
            </button>
          )}
        </div>

        {/* 区切り */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: 'var(--cl-border)' }} />
          <span className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>次のステップへ</span>
          <div className="flex-1 h-px" style={{ background: 'var(--cl-border)' }} />
        </div>

        {/* 施工事例・ブログ（次ページ） */}
        <button onClick={() => router.push(`/project/${id}/interview`)} className="cl-btn-primary">
          施工事例・ブログを作る →
        </button>
      </main>
    </div>
  )
}
