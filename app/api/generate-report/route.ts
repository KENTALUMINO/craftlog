import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { projectId, userEmail } = await req.json()

    // 案件情報を取得
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

    // 写真を取得
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: '写真がありません' }, { status: 400 })
    }

    // 工程ごとにグループ化
    const grouped = photos.reduce((acc: Record<string, typeof photos>, p) => {
      const phase = p.phase || '未分類'
      if (!acc[phase]) acc[phase] = []
      acc[phase].push(p)
      return acc
    }, {})

    // 写真URLを取得
    const getUrl = (path: string) =>
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`

    // HTML形式でレポートを作成
    const phaseSections = Object.entries(grouped).map(([phase, phasePhotos]) => {
      const photoGrid = (phasePhotos as typeof photos).slice(0, 6).map(p => `
        <div style="width:30%;margin:1%;display:inline-block;vertical-align:top;">
          <img src="${getUrl(p.storage_path)}" style="width:100%;height:150px;object-fit:cover;border-radius:4px;" />
        </div>
      `).join('')

      return `
        <div style="margin-bottom:30px;page-break-inside:avoid;">
          <h3 style="background:#1f2a44;color:white;padding:8px 16px;border-radius:4px;font-size:14px;margin-bottom:12px;">
            ${phase}（${(phasePhotos as typeof photos).length}枚）
          </h3>
          <div>${photoGrid}</div>
        </div>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>完工報告書</title></head>
      <body style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;">
        <div style="text-align:center;border:2px solid #1f2a44;padding:40px;margin-bottom:40px;">
          <h1 style="font-size:32px;color:#1f2a44;margin-bottom:20px;">完工報告書</h1>
          <h2 style="font-size:20px;margin-bottom:8px;">${project.case_name}</h2>
          <p style="color:#666;">${project.work_type}</p>
          ${project.start_date ? `<p style="color:#666;">工事期間：${project.start_date} 〜 ${project.end_date || '未定'}</p>` : ''}
        </div>

        <h2 style="color:#1f2a44;border-bottom:2px solid #1f2a44;padding-bottom:8px;margin-bottom:24px;">工事概要</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f5f5f5;width:30%;">現場名</td><td style="border:1px solid #ddd;padding:10px;">${project.case_name}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f5f5f5;">工事種類</td><td style="border:1px solid #ddd;padding:10px;">${project.work_type}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:10px;background:#f5f5f5;">施工地域</td><td style="border:1px solid #ddd;padding:10px;">${project.area}</td></tr>
          ${project.start_date ? `<tr><td style="border:1px solid #ddd;padding:10px;background:#f5f5f5;">工事期間</td><td style="border:1px solid #ddd;padding:10px;">${project.start_date} 〜 ${project.end_date || '未定'}</td></tr>` : ''}
        </table>

        <h2 style="color:#1f2a44;border-bottom:2px solid #1f2a44;padding-bottom:8px;margin-bottom:24px;">施工写真</h2>
        ${phaseSections}
      </body>
      </html>
    `

    // メール送信
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: `【完工報告書】${project.case_name} ${project.work_type}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
