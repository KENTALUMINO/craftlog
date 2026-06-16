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
    const { projectId, userId } = await req.json()

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

    const standardPhasesText = standardPhases.length > 0
      ? `\n\n【標準工程名リスト】（phaseはこの中から最も近いものを選ぶ）\n${standardPhases.join('\n')}`
      : ''

    // 対象プロジェクトの全写真を取得
    const { data: photos } = await supabase
      .from('photos')
      .select('id, storage_path')
      .eq('project_id', projectId)

    if (!photos || photos.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`
    let updated = 0

    for (const photo of photos) {
      try {
        const imageUrl = baseUrl + photo.storage_path
        const imageRes = await fetch(imageUrl)
        const arrayBuffer = await imageRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

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

1. category（工事の種類でグループ分けに使う）
   ＝ この現場で行っている「工事の大きな種類」
   優先順位：
   ① 黒板に「工事種類」「工事名」などの記載があれば → その値（例：「防水工事」「長尺シート工事」「塗装工事」「シール工事」「外壁補修工事」）
   ② 工事種類の記載がなければ → 写真の作業内容から工事の種類を推定（例：シート貼り作業→「長尺シート工事」、液体塗布の防水作業→「防水工事」）
   ③ 工事種類が判断できなければ → null
   ※ 「廊下」「バルコニー」「屋上」などの場所はcategoryにしない

2. phase（具体的な作業名）
   - 「今何をしているか」を表す最も具体的な言葉
   - 工事件名・案件名・会社名・日付は除く
   - 短く（10文字以内が理想）${standardPhases.length > 0 ? '\n   - 標準工程名リストから最も近いものを選ぶ' : ''}
   - 同じ工事種類で複数の場所がある場合は、場所を含める（例：「廊下 端末シール」「屋上 プライマー塗布」）
   - 例：「プライマー塗布」「シート裁断」「端末シール」「ケレン」「下塗り」「完了」

黒板がない場合は {"category": null, "phase": null} を返してください。
JSONのみ返してください。説明文不要。

返す形式: {"category": "防水工事", "phase": "プライマー塗布"}`,
              },
            ],
          }],
        })

        const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const newPhase = parsed.phase ?? null
          const newCategory = parsed.category ?? null

          await supabase.from('photos').update({
            phase: newPhase,
            phase_category: newCategory,
          }).eq('id', photo.id)

          updated++
        }
      } catch {
        // 1枚失敗してもスキップして続行
      }
    }

    return NextResponse.json({ updated, total: photos.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
