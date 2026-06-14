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

  const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const getPlaceholder = () => {
    const last = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? ''
    if (last.includes('お悩み') || last.includes('困って') || last.includes('きっかけ')) return '例）雨漏りが3年前から続いていて、天井にシミが出てきた'
    if (last.includes('状態') || last.includes('様子') || last.includes('どんな')) return '例）コケが広がっていて、板金部分が錆びていた'
    if (last.includes('提案') || last.includes('工夫') || last.includes('ポイント')) return '例）既存の屋根の上にカバー工法で重ね張りした'
    if (last.includes('期間') || last.includes('どのくらい')) return '例）5年以上前から少しずつひどくなっていた'
    if (last.includes('反応') || last.includes('言葉') || last.includes('喜')) return '例）「こんなにきれいになるとは思わなかった」と言ってくれた'
    if (last.includes('金額') || last.includes('費用') || last.includes('予算')) return '例）最初は外壁もやりたかったが、今回は屋根だけに絞った'
    return '例）〜でした、〜してもらいました'
  }

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
        <button onClick={() => router.push(`/project/${id}/report`)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div>
          <h1 className="text-base font-bold text-gray-900">{project.case_name}</h1>
          <p className="text-xs text-gray-500">{project.work_type}　{project.area}</p>
        </div>
      </header>

      {/* ステップバー */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center max-w-2xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 ${i === 3 ? 'text-blue-600' : i < 3 ? 'text-green-500' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 3 ? 'bg-blue-600 text-white' : i < 3 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < 3 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* チャット */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((m, i) => {
          const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
          return (
            <div key={i}>
              <div className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">AI</div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
              {isLastAssistant && !isDone && (
                <p className="text-xs text-gray-400 mt-2 ml-10">{getPlaceholder()}</p>
              )}
            </div>
          )
        })}

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
        <div className="bg-white border-t border-gray-100 px-3 py-3 flex gap-2 flex-shrink-0 safe-area-bottom">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="回答を入力..."
            disabled={loading}
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-40 flex-shrink-0"
          >
            送信
          </button>
        </div>
      )}
    </div>
  )
}
