import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `あなたは建設・リフォーム会社の施工事例・ブログ記事作成のためのインタビュアーです。

職人やスタッフから工事の話を聞き出し、読者に響くブログ記事や施工事例に使える情報を集めます。

【インタビューの進め方】
1. まず「お客様のお悩み」「工事のポイント」「お客様の反応」の3つを順番に聞く
2. 回答が以下のような場合は必ず深掘りする：
   - 抽象的・短すぎる（「きれいになった」「喜んでもらった」など）
   - 数字や具体的なエピソードがない
   - ブログに使えそうな面白いポイントが隠れていそう
3. 深掘りは1回の返答につき1問だけ。一度にたくさん聞かない
4. 十分な情報が集まったら（3〜6往復が目安）「ありがとうございます！これで記事を生成できます。」と伝えて終了する

【深掘りの例】
- 「費用を抑えたかった」→「費用を抑えるために具体的にどんな提案をしましたか？」
- 「喜んでもらった」→「お客様はどんな言葉をかけてくれましたか？」
- 「傷みがひどかった」→「どのくらいひどかったか、具体的に教えてもらえますか？」

【話し方】
- 現場の職人やスタッフに話しかけるような、やわらかい口調
- 質問は短く、1問ずつ
- 「なるほど」「それは大変でしたね」など共感を入れる`

export async function POST(req: NextRequest) {
  try {
    const { messages, projectInfo } = await req.json()

    const systemWithProject = `${SYSTEM_PROMPT}

【この案件の基本情報】
現場名：${projectInfo.case_name}
工事種類：${projectInfo.work_type}
地域：${projectInfo.area}
${projectInfo.start_date ? `工期：${projectInfo.start_date} 〜 ${projectInfo.end_date || '未定'}` : ''}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemWithProject,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const isDone = text.includes('記事を生成できます')

    return NextResponse.json({ text, isDone })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
