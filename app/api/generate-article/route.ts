import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages, projectInfo } = await req.json()

    const conversation = messages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'スタッフ' : 'インタビュアー'}：${m.content}`)
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `以下のインタビュー内容をもとに、施工事例ブログ記事を書いてください。

【案件情報】
現場名：${projectInfo.case_name}
工事種類：${projectInfo.work_type}
地域：${projectInfo.area}

【インタビュー内容】
${conversation}

【記事の要件】
- 800〜1200文字程度
- 見出し（##）を2〜3個使う
- お客様目線で読みやすい文章
- 「〜になりました」「心地よい」などの常套句は避ける
- 具体的なエピソードや数字を活かす
- 最後に工事の問い合わせを自然に促す一文を入れる
- Markdown形式で出力する`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
