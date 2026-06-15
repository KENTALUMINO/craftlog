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

    // プロジェクトから会社のgoogle_review_urlを取得
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (project) {
      const { data: company } = await supabase
        .from('companies')
        .select('google_review_url')
        .eq('user_id', project.user_id)
        .single()
      if (company?.google_review_url) setGoogleUrl(company.google_review_url)
    }

    await supabase.from('surveys').insert({
      project_id: projectId,
      rating,
      comment,
    })

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🙏</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">ありがとうございました</h1>
          <p className="text-sm text-gray-500 mb-8">貴重なご意見をいただきありがとうございます。</p>

          {googleUrl && (
            <div className="bg-gray-50 rounded-xl p-5 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                よろしければGoogleでも一言いただけると嬉しいです
              </p>

              {comment && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">今の回答をそのまま使えます</p>
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mb-2">
                    {comment}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="w-full text-sm bg-gray-100 text-gray-600 rounded-lg py-2 hover:bg-gray-200 transition"
                  >
                    {copied ? '✓ コピーしました' : '📋 コピーする'}
                  </button>
                </div>
              )}

              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white text-center rounded-xl py-3 text-sm font-medium hover:bg-blue-700 transition"
              >
                Googleで口コミを書く →
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">工事はいかがでしたか？</h1>
        <p className="text-sm text-gray-400 text-center mb-8">一言いただけると大変励みになります</p>

        {/* 星評価 */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="text-4xl transition-transform hover:scale-110"
            >
              <span className={(hover || rating) >= star ? 'text-yellow-400' : 'text-gray-200'}>
                ★
              </span>
            </button>
          ))}
        </div>

        {/* コメント */}
        <textarea
          rows={4}
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-6"
          placeholder="例）丁寧な対応で安心できました。仕上がりもきれいでした。（任意）"
          style={{ fontSize: '16px' }}
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full bg-blue-600 text-white rounded-xl py-4 text-sm font-medium disabled:opacity-40 transition hover:bg-blue-700"
        >
          {submitting ? '送信中...' : '送信する'}
        </button>
      </div>
    </div>
  )
}
