'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; content: string }
type Project = { id: string; case_name: string; work_type: string; area: string; start_date: string; end_date: string }

export default function InterviewPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('projects').select('*').eq('id', id).single()
      if (data) {
        setProject(data)
        // 最初の質問を自動送信
        startInterview(data)
      }
    }
    init()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, article])

  const startInterview = async (proj: Project) => {
    setLoading(true)
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'インタビューを始めてください' }],
        projectInfo: proj,
      }),
    })
    const data = await res.json()
    setMessages([{ role: 'assistant', content: data.text }])
    setLoading(false)
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !project) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages, projectInfo: project }),
    })
    const data = await res.json()
    setMessages([...newMessages, { role: 'assistant', content: data.text }])
    setIsDone(data.isDone)
    setLoading(false)
  }

  const handleGenerateArticle = async () => {
    if (!project) return
    setGenerating(true)
    const res = await fetch('/api/generate-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, projectInfo: project }),
    })
    const data = await res.json()
    setArticle(data.text)
    setGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(article)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push(`/project/${id}`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div>
          <h1 className="text-base font-bold text-gray-900">施工事例インタビュー</h1>
          <p className="text-xs text-gray-500">{project.case_name}　{project.work_type}</p>
        </div>
      </header>

      {/* チャット */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">AI</div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="text-gray-400 text-sm">入力中...</span>
            </div>
          </div>
        )}

        {/* 記事生成ボタン */}
        {isDone && !article && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleGenerateArticle}
              disabled={generating}
              className="bg-gray-900 text-white rounded-xl px-6 py-3 text-sm font-medium disabled:opacity-50"
            >
              {generating ? '記事を生成中...' : '✨ 施工事例・ブログ記事を生成する'}
            </button>
          </div>
        )}

        {/* 生成された記事 */}
        {article && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-gray-700">生成された記事</p>
              <button
                onClick={handleCopy}
                className="text-xs bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-200 transition"
              >
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{article}</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      {!isDone && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="回答を入力..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-5 py-3 text-sm font-medium disabled:opacity-40"
          >
            送信
          </button>
        </div>
      )}
    </div>
  )
}
