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
    const { projectId } = await req.json()

    // このプロジェクトの全工程名を取得
    const { data: photos } = await supabase
      .from('photos')
      .select('phase')
      .eq('project_id', projectId)
      .not('phase', 'is', null)

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: '写真がありません' }, { status: 400 })
    }

    const phases = [...new Set(photos.map(p => p.phase).filter(Boolean))] as string[]
    if (phases.length === 0) return NextResponse.json({ mapping: {}, updatedCount: 0 })

    // Claude に工程名の整理を依頼
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `以下は工事現場の黒板から読み取った工程名の一覧です。
同じ作業を指している工程名をひとつの短い名前に統一してください。

工程名リスト:
${phases.map((p, i) => `${i + 1}. ${p}`).join('\n')}

【ルール】
- 案件名・工事名・場所名は削除する
  例：「第2ファミーレマンション改修工事 長尺シート工事 端末シール」→「端末シール」
- 同じ作業の表記ゆれは統一する
  例：「長尺シート工事」「長尺シート工事（施工前）」→どちらも実態が同じなら統一
- 作業の種類が明らかに違うものは別のままにする
- 工程名は短く（できれば10文字以内）
- 必ずJSON形式のみで返す。説明文は一切不要。

返す形式:
{"元の工程名1": "統一後の工程名", "元の工程名2": "統一後の工程名", ...}

全ての工程名をJSONに含めてください。変更しないものも元の名前をそのまま値にしてください。`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'

    let mapping: Record<string, string> = {}
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) mapping = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'AIの返答を解析できませんでした' }, { status: 500 })
    }

    // 変更があるもののみDBに反映
    const updates = Object.entries(mapping).filter(([old, newName]) => old !== newName)
    for (const [oldPhase, newPhase] of updates) {
      await supabase
        .from('photos')
        .update({ phase: newPhase })
        .eq('project_id', projectId)
        .eq('phase', oldPhase)
    }

    return NextResponse.json({ mapping, updatedCount: updates.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
