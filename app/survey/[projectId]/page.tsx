'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function SurveyPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [googleUrl, setGoogleUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)

    const { data: project } = await supabase.from('projects').select('user_id').eq('id', projectId).single()
    if (project) {
      const { data: company } = await supabase.from('companies').select('google_review_url').eq('user_id', project.user_id).single()
      if (company?.google_review_url) setGoogleUrl(company.google_review_url)
    }

    await supabase.from('surveys').insert({ project_id: projectId, rating, comment })
    setSubmitting(false)
    setDone(true)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(comment)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cl-bg)' }}>
        <div className="cl-card p-8 max-w-md w-full text-center">

          {/* チェックマーク */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--cl-green-light)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M7 17 L13 23 L25 10" stroke="var(--cl-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--cl-text)' }}>
            アンケートにご回答いただき、ありがとうございます。
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--cl-text-muted)' }}>
            いただいたご意見は、今後のサービス向上に活かしてまいります。
          </p>

          {googleUrl && (
            <div className="rounded-xl p-5 text-left" style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--cl-text)' }}>
                よろしければGoogleでも一言いただけると嬉しいです
              </p>

              {comment && (
                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: 'var(--cl-text-muted)' }}>今の回答をそのまま使えます</p>
                  <div className="rounded-lg px-4 py-3 text-sm mb-2"
                    style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', color: 'var(--cl-text)' }}>
                    {comment}
                  </div>
                  <button onClick={handleCopy} className="cl-btn-ghost" style={{ padding: '10px 16px', fontSize: '13px' }}>
                    {copied ? '✓ コピーしました' : 'コピーする'}
                  </button>
                </div>
              )}

              <a href={googleUrl} target="_blank" rel="noopener noreferrer"
                className="cl-btn-primary" style={{ textDecoration: 'none', display: 'flex' }}>
                Googleで口コミを書く →
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--cl-bg)' }}>
      <div className="cl-card p-8 max-w-md w-full">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--cl-orange-light)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9 L12 3 L21 9 V20 H15 V14 H9 V20 H3 V9Z" stroke="var(--cl-orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--cl-text)' }}>工事はいかがでしたか？</h1>
          <p className="text-sm" style={{ color: 'var(--cl-text-muted)' }}>一言いただけると大変励みになります</p>
        </div>

        {/* 星評価 */}
        <div className="flex justify-center gap-3 mb-7">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="text-4xl transition-transform hover:scale-110">
              <span style={{ color: (hover || rating) >= star ? '#f59e0b' : 'var(--cl-border)', transition: 'color 0.1s' }}>★</span>
            </button>
          ))}
        </div>

        {/* コメント */}
        <textarea rows={4} value={comment}
          onChange={e => setComment(e.target.value)}
          className="cl-input resize-none mb-5"
          placeholder="例）丁寧な対応で安心できました。仕上がりもきれいでした。（任意）"
          style={{ fontSize: '16px' }}
        />

        <button onClick={handleSubmit} disabled={rating === 0 || submitting} className="cl-btn-primary">
          {submitting ? '送信中...' : '送信する'}
        </button>
      </div>
    </div>
  )
}
