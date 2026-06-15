import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, existingPhases } = await req.json()

    const imageRes = await fetch(imageUrl)
    const arrayBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

    const phasesText = existingPhases.length > 0
      ? `【この案件の工程名一覧】\n${existingPhases.join('\n')}`
      : '（工程名の登録なし）'

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
          },
          {
            type: 'text',
            text: `この写真に写っている作業内容・場所・状態を見て、どの工程の写真か判定してください。

${phasesText}

【判定ルール】
- 上の工程名一覧から最も近いものを選ぶ
- 写真の作業内容（塗装・シート貼り・防水など）・場所（廊下・バルコニー・外壁など）・作業段階（準備・施工中・完了など）で判断
- 自信がある場合は confidence を "high"、判断が難しい場合は "low" にする
- 工程名一覧がない場合や、一致するものが明らかにない場合は phase を null にする

JSONのみ返してください。説明文不要。

返す形式: {"phase": "廊下 中塗り", "confidence": "high", "reason": "ローラーで壁を塗っている様子が確認できる"}
または: {"phase": null, "confidence": "low", "reason": "黒板も見当たらず作業内容が判断できない"}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          phase: parsed.phase ?? null,
          confidence: parsed.confidence ?? 'low',
          reason: parsed.reason ?? '',
        })
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ phase: null, confidence: 'low', reason: '' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ phase: null, confidence: 'low', reason: '' })
  }
}
