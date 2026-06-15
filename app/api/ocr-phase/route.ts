import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()

    // 画像をfetchしてbase64に変換
    const imageRes = await fetch(imageUrl)
    const arrayBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
          },
          {
            type: 'text',
            text: `この写真に工事黒板（デジタル黒板含む）が写っている場合、「工程名・作業名」だけを抽出してください。

【絶対に含めないもの】
- 工事名・案件名（例：第2ファミーレマンション改修工事）
- 工事場所・施工箇所の場所名（例：バルコニー、共用部、PS）
- 会社名・施工会社名
- 日付

【抽出するもの】
- 作業の種類・工程名のみ（例：下塗り、上塗り、シール施工、高圧洗浄、プライマー塗布）

黒板がない、または工程名が読み取れない場合は「なし」とだけ答えてください。
工程名が読み取れた場合はその工程名だけを短く答えてください。余計な説明は不要です。
例：「トップコート」「下地処理」「高圧洗浄」「シール施工完了」など`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : 'なし'
    const phase = text === 'なし' ? null : text

    return NextResponse.json({ phase })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ phase: null })
  }
}
