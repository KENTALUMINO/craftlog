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

  const handleDownloadHTML = () => {
    if (!project || !article) return

    // タイトル抽出（最初の # 行）
    const titleMatch = article.match(/^#\s+(.+)/m)
    const title = titleMatch ? titleMatch[1].trim() : project.case_name
    const today = new Date()
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
    const dateIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Markdown → HTML 変換
    const mdToHtml = (md: string): string => {
      const lines = md.split('\n')
      const result: string[] = []
      let inUl = false
      let inOl = false
      let pBuf: string[] = []

      const flushP = () => {
        if (pBuf.length > 0) {
          result.push(`<p>${pBuf.join(' ')}</p>`)
          pBuf = []
        }
      }
      const flushUl = () => { if (inUl) { result.push('</ul>'); inUl = false } }
      const flushOl = () => { if (inOl) { result.push('</ol>'); inOl = false } }

      const inline = (s: string) =>
        s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.+?)\*/g, '<em>$1</em>')

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) {
          flushP(); flushUl(); flushOl()
          continue
        }
        if (/^#{1}\s/.test(line)) continue // # タイトルはヒーローで使う
        if (/^#{2}\s/.test(line)) {
          flushP(); flushUl(); flushOl()
          result.push(`<h2>${inline(line.replace(/^#{2}\s/, ''))}</h2>`)
          continue
        }
        if (/^#{3}\s/.test(line)) {
          flushP(); flushUl(); flushOl()
          result.push(`<h3>${inline(line.replace(/^#{3}\s/, ''))}</h3>`)
          continue
        }
        if (/^[-*]\s/.test(line)) {
          flushP(); flushOl()
          if (!inUl) { result.push('<ul>'); inUl = true }
          result.push(`<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`)
          continue
        }
        if (/^\d+\.\s/.test(line)) {
          flushP(); flushUl()
          if (!inOl) { result.push('<ol>'); inOl = true }
          result.push(`<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`)
          continue
        }
        flushUl(); flushOl()
        pBuf.push(inline(line))
      }
      flushP(); flushUl(); flushOl()
      return result.join('\n      ')
    }

    // # 行を除いた本文の最初の段落をサマリーに
    const bodyLines = article.split('\n').filter(l => !/^#\s/.test(l.trim()))
    const firstPara = bodyLines.find(l => l.trim() && !/^#{1,3}/.test(l.trim()))?.trim() ?? ''
    const bodyHtml = mdToHtml(article)

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | コラム | ハウスクラフト</title>
<meta name="description" content="${firstPara.slice(0, 120)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title} | ハウスクラフト コラム">
<meta name="theme-color" content="#1f2a44">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
<style>
.art-hero{background:var(--ink);padding:140px 0 64px;color:#fff}
.art-hero .wrap{max-width:760px}
.art-hero .meta{display:flex;gap:12px;align-items:center;margin-bottom:18px}
.art-hero .cat{font-family:"Jost";font-size:11px;letter-spacing:.2em;color:var(--lime);background:rgba(188,208,47,.15);border-radius:999px;padding:4px 14px}
.art-hero .date{font-family:"Jost";font-size:11.5px;color:rgba(255,255,255,.6)}
.art-hero h1{font-family:"Zen Old Mincho";font-size:clamp(22px,3.2vw,34px);font-weight:600;line-height:1.55;letter-spacing:.03em}
.art-hero .summary{margin-top:18px;font-size:14.5px;color:rgba(255,255,255,.78);line-height:1.9}
.art-body{padding:60px 0 100px}
.art-body .wrap{max-width:760px}
.art-content{line-height:2;font-size:15px}
.art-content h2{font-family:"Zen Old Mincho";font-size:21px;font-weight:600;letter-spacing:.03em;margin:52px 0 18px;padding-bottom:12px;border-bottom:2px solid var(--cream-deep)}
.art-content h3{font-family:"Zen Old Mincho";font-size:17px;font-weight:600;letter-spacing:.03em;margin:36px 0 12px;padding-left:14px;border-left:3px solid var(--lime)}
.art-content p{margin-bottom:22px}
.art-content ul,.art-content ol{padding-left:1.5em;margin-bottom:22px}
.art-content li{margin-bottom:8px;line-height:1.9}
.art-cta{background:var(--navy);color:#fff;border-radius:12px;padding:36px 40px;margin-top:60px;text-align:center}
.art-cta p{font-size:14px;color:rgba(255,255,255,.8);line-height:1.9;margin-bottom:20px}
.art-cta .tel{font-family:"Jost";font-size:26px;font-weight:500;letter-spacing:.08em;margin-bottom:6px}
.art-cta .btn{display:inline-flex;align-items:center;gap:8px;background:var(--lime);color:var(--ink);border-radius:999px;padding:13px 28px;font-weight:500;font-size:14px;letter-spacing:.06em;transition:.3s;margin-top:12px}
.art-cta .btn:hover{background:#fff}
@media(max-width:680px){.art-cta{padding:28px 22px}}
</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${title}","datePublished":"${dateIso}","author":{"@type":"Organization","name":"ハウスクラフト株式会社"},"publisher":{"@type":"Organization","name":"ハウスクラフト株式会社"}}
</script>
</head>
<body>

<header id="hdr" class="scrolled">
  <a class="logo" href="../index.html">
    <span class="mark">H</span>
    <span class="name">HOUSE CRAFT<small>平塚 総合リフォーム</small></span>
  </a>
  <nav class="headnav" aria-label="主要メニュー">
    <a href="../index.html#concept">想い</a>
    <a href="../index.html#services">リフォーム</a>
    <a href="../works.html">施工事例</a>
    <a href="../index.html#points">選ばれる理由</a>
    <a href="tel:0463436122" class="nav-cta">TEL. 0463-43-6122</a>
  </nav>
  <button class="burger" id="burger" aria-label="メニュー" aria-controls="navov" aria-expanded="false"><span></span><span></span><span></span></button>
</header>
<nav class="navov" id="navov">
  <ul>
    <li><a href="../index.html#concept">私たちの想い <span>CONCEPT</span></a></li>
    <li><a href="../index.html#services">リフォーム <span>SERVICE</span></a></li>
    <li><a href="../works.html">施工事例 <span>WORKS</span></a></li>
    <li><a href="../index.html#points">選ばれる理由 <span>REASON</span></a></li>
    <li><a href="../contact.html">お問い合わせ <span>CONTACT</span></a></li>
  </ul>
</nav>

<section class="art-hero">
  <div class="wrap">
    <div class="meta">
      <span class="cat">${project.work_type}</span>
      <span class="date">${dateStr}</span>
    </div>
    <h1>${title}</h1>
    <p class="summary">${firstPara}</p>
  </div>
</section>

<div class="wrap" style="padding-top:20px;max-width:760px">
  <nav class="crumb" aria-label="パンくず"><a href="../index.html">ホーム</a><span>›</span><a href="../column.html">コラム</a><span>›</span>${title}</nav>
</div>

<article class="art-body">
  <div class="wrap">
    <div class="art-content">
      ${bodyHtml}

      <div class="art-cta">
        <p>${project.area}での${project.work_type}など、お住まいのことは何でもご相談ください。<br>「今すぐ必要か、もう少し待てるか」も正直にお伝えします。</p>
        <div class="tel">TEL. 0463-43-6122</div>
        <a class="btn" href="../contact.html">無料で相談する ›</a>
      </div>
    </div>

    <div style="text-align:center;margin-top:36px">
      <a style="display:inline-flex;align-items:center;gap:8px;background:var(--navy);color:#fff;border-radius:999px;padding:13px 28px;font-size:14px;letter-spacing:.06em" href="../column.html">コラム一覧へ戻る ›</a>
    </div>
  </div>
</article>

<footer>
  <div class="wrap">
    <div class="top">
      <div>
        <div class="name">HOUSE CRAFT</div>
        <div class="addr">ハウスクラフト株式会社<br>〒254-0081 神奈川県平塚市豊田打間木611-1<br>TEL. 0463-43-6122　受付 10:00〜19:00</div>
      </div>
    </div>
    <div class="copy">© 2026 HOUSE CRAFT Co., Ltd. All rights reserved.</div>
  </div>
</footer>

<div class="mobile-cta" aria-label="固定お問い合わせ">
  <a href="../contact.html">無料点検</a>
  <a href="tel:0463436122">電話する</a>
</div>

<script>
const burger=document.getElementById('burger'),navov=document.getElementById('navov');
burger.addEventListener('click',()=>{const o=!navov.classList.contains('open');burger.classList.toggle('open',o);navov.classList.toggle('open',o);burger.setAttribute('aria-expanded',String(o));document.body.style.overflow=o?'hidden':''});
navov.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{burger.classList.remove('open');navov.classList.remove('open');document.body.style.overflow=''}));
</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `column-${project.case_name.replace(/\s+/g, '-')}-${dateIso}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!project) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push(`/project/${id}/report`)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
          <span>←</span><span>前の手順へ</span>
        </button>
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
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-200 transition"
                >
                  {copied ? '✓ コピー済み' : 'コピー'}
                </button>
                <button
                  onClick={handleDownloadHTML}
                  className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition"
                >
                  HTMLを書き出す
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{article}</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      {!isDone && (
        <div className="bg-white border-t border-gray-100 px-3 py-3 flex gap-2 flex-shrink-0 safe-area-bottom">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e.preventDefault(), handleSend())}
            className="flex-1 border border-gray-200 rounded-xl pr-3 py-3 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
            placeholder="回答を入力..."
            disabled={loading}
            style={{ fontSize: '16px', paddingLeft: '44px' }}
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
