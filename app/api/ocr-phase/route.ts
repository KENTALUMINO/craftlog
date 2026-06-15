import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId } = await req.json()

    // 標準工程名リストを取得
    let standardPhases: string[] = []
    if (userId) {
      const { data: company } = await supabase
        .from('companies')
        .select('standard_phases')
        .eq('user_id', userId)
        .single()
      if (company?.standard_phases && Array.isArray(company.standard_phases)) {
        standardPhases = company.standard_phases
      }
    }

    // 画像をfetchしてbase64に変換
    const imageRes = await fetch(imageUrl)
    const arrayBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

    const standardPhasesText = standardPhases.length > 0
      ? `\n\n【標準工程名リスト】（phaseはこの中から最も近いものを選ぶ）\n${standardPhases.join('\n')}`
      : ''

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
          },
          {
            type: 'text',
            text: `この写真に工事黒板（デジタル黒板含む）が写っている場合、以下の2つを読み取ってください。${standardPhasesText}

【読み取る項目】

1. category（グループ分けに使う）
   優先順位：
   ① 黒板に「工事場所」の記載があれば → その値（例：「廊下」「バルコニー」「外回り」「玄関」）
   ② 工事場所がなければ → 工事の大きな種類（例：「塗装工事」「長尺シート工事」「防水工事」）
   ③ どちらもなければ → null

2. phase（具体的な作業名）
   - 「今何をしているか」を表す最も具体的な言葉
   - 工事件名・案件名・会社名・日付は除く
   - 短く（10文字以内が理想）${standardPhases.length > 0 ? '\n   - 標準工程名リストから最も近いものを選ぶ' : ''}
   - 例：「シート裁断」「下塗り」「端末シール」「ケレン」

黒板がない場合は {"category": null, "phase": null} を返してください。
JSONのみ返してください。説明文不要。

返す形式: {"category": "廊下", "phase": "シート裁断"}`,
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
          category: parsed.category ?? null,
        })
      }
    } catch {
      // JSON解析失敗時はテキストをそのままphaseとして使う
    }

    // フォールバック：旧形式（テキストのみ）
    const phase = text === 'なし' || !text ? null : text
    return NextResponse.json({ phase, category: null })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ phase: null, category: null })
  }
}
