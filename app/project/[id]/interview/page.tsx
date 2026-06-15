'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; content: string }
type Project = { id: string; case_name: string; work_type: string; area: string; start_date: string; end_date: string }

const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

const StepBar = ({ current }: { current: number }) => (
  <div style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-3 flex-shrink-0">
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

  const getPlaceholder = () => {
    const last = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? ''
    if (last.includes('お悩み') || last.includes('困って') || last.includes('きっかけ')) return '例）雨漏りが3年前から続いていて、天井にシミが出てきた'
    if (last.includes('状態') || last.includes('様子') || last.includes('どんな')) return '例）コケが広がっていて、板金部分が錆びていた'
    if (last.includes('提案') || last.includes('工夫') || last.includes('ポイント')) return '例）既存の屋根の上にカバー工法で重ね張りした'
    if (last.includes('期間') || last.includes('どのくらい')) return '例）5年以上前から少しずつひどくなっていた'
    if (last.includes('反応') || last.includes('言葉') || last.includes('喜')) return '例）「こんなにきれいになるとは思わなかった」と言ってくれた'
    return '例）〜でした、〜してもらいました'
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('projects').select('*').eq('id', id).single()
      if (data) { setProject(data); startInterview(data) }
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
      body: JSON.stringify({ messages: [{ role: 'user', content: 'インタビューを始めてください' }], projectInfo: proj }),
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
    const titleMatch = article.match(/^#\s+(.+)/m)
    const title = titleMatch ? titleMatch[1].trim() : project.case_name
    const today = new Date()
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
    const dateIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const mdToHtml = (md: string): string => {
      const lines = md.split('\n')
      const result: string[] = []
      let inUl = false, inOl = false
      let pBuf: string[] = []
      const flushP = () => { if (pBuf.length > 0) { result.push(`<p>${pBuf.join(' ')}</p>`); pBuf = [] } }
      const flushUl = () => { if (inUl) { result.push('</ul>'); inUl = false } }
      const flushOl = () => { if (inOl) { result.push('</ol>'); inOl = false } }
      const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
      for (const raw of lines) {
        const line = raw.trim()
        if (!line) { flushP(); flushUl(); flushOl(); continue }
        if (/^#{1}\s/.test(line)) continue
        if (/^#{2}\s/.test(line)) { flushP(); flushUl(); flushOl(); result.push(`<h2>${inline(line.replace(/^#{2}\s/, ''))}</h2>`); continue }
        if (/^#{3}\s/.test(line)) { flushP(); flushUl(); flushOl(); result.push(`<h3>${inline(line.replace(/^#{3}\s/, ''))}</h3>`); continue }
        if (/^[-*]\s/.test(line)) { flushP(); flushOl(); if (!inUl) { result.push('<ul>'); inUl = true } result.push(`<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`); continue }
        if (/^\d+\.\s/.test(line)) { flushP(); flushUl(); if (!inOl) { result.push('<ol>'); inOl = true } result.push(`<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`); continue }
        flushUl(); flushOl(); pBuf.push(inline(line))
      }
      flushP(); flushUl(); flushOl()
      return result.join('\n      ')
    }

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
  <a class="logo" href="../index.html"><span class="mark">H</span><span class="name">HOUSE CRAFT<small>平塚 総合リフォーム</small></span></a>
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
    <div class="meta"><span class="cat">${project.work_type}</span><span class="date">${dateStr}</span></div>
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
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>読み込み中...</div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cl-bg)' }}>

      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push(`/project/${id}/report`)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← 前の手順へ
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>{project.case_name}</h1>
          <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{project.work_type}　{project.area}</p>
        </div>
      </header>

      <StepBar current={3} />

      {/* チャット */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((m, i) => {
          const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
          return (
            <div key={i}>
              <div className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                    style={{ background: 'var(--cl-orange-light)', color: 'var(--cl-orange)' }}>AI</div>
                )}
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words"
                  style={m.role === 'user'
                    ? { background: 'var(--cl-orange)', color: '#fff', borderBottomRightRadius: '4px' }
                    : { background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', color: 'var(--cl-text)', borderBottomLeftRadius: '4px' }}>
                  {m.content}
                </div>
              </div>
              {isLastAssistant && !isDone && (
                <p className="text-xs mt-2 ml-10" style={{ color: 'var(--cl-text-muted)' }}>{getPlaceholder()}</p>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)' }}>
              <span className="text-sm" style={{ color: 'var(--cl-text-muted)' }}>入力中...</span>
            </div>
          </div>
        )}

        {isDone && !article && (
          <div className="flex justify-center pt-2">
            <button onClick={handleGenerateArticle} disabled={generating} className="cl-btn-primary"
              style={{ width: 'auto', padding: '12px 24px' }}>
              {generating ? '記事を生成中...' : '施工事例・ブログ記事を生成する'}
            </button>
          </div>
        )}

        {article && (
          <div className="cl-card p-5 mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--cl-text)' }}>生成された記事</p>
              <div className="flex gap-2">
                <button onClick={handleCopy}
                  className="text-xs px-3 py-1.5 rounded-lg transition"
                  style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-sub)', border: '1px solid var(--cl-border)' }}>
                  {copied ? '✓ コピー済み' : 'コピー'}
                </button>
                <button onClick={handleDownloadHTML}
                  className="text-xs px-3 py-1.5 rounded-lg transition"
                  style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                  HTMLを書き出す
                </button>
              </div>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--cl-text)' }}>{article}</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      {!isDone && (
        <div className="px-3 py-3 flex gap-2 flex-shrink-0"
          style={{ background: 'var(--cl-surface)', borderTop: '1px solid var(--cl-border)' }}>
          <textarea rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && (e.preventDefault(), handleSend())}
            className="flex-1 cl-input resize-none overflow-hidden"
            placeholder="回答を入力..."
            disabled={loading}
            style={{ fontSize: '16px', paddingLeft: '16px' }}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} className="cl-btn-orange flex-shrink-0"
            style={{ width: 'auto', padding: '12px 20px' }}>
            送信
          </button>
        </div>
      )}
    </div>
  )
}
