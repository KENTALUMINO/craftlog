import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'

Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: path.resolve('./public/fonts/NotoSansJP-Regular.ttf'), fontWeight: 'normal' },
    { src: path.resolve('./public/fonts/NotoSansJP-Bold.ttf'), fontWeight: 'bold' },
  ],
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSansJP', backgroundColor: '#ffffff' },
  titleBox: { border: '2pt solid #1f2a44', padding: 30, marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 28, fontFamily: 'NotoSansJP', fontWeight: 'bold', color: '#1f2a44', marginBottom: 12 },
  caseName: { fontSize: 16, fontFamily: 'NotoSansJP', fontWeight: 'bold', marginBottom: 6 },
  subText: { fontSize: 11, color: '#666666', marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'NotoSansJP', fontWeight: 'bold', color: '#1f2a44', borderBottom: '2pt solid #1f2a44', paddingBottom: 6, marginBottom: 12, marginTop: 20 },
  table: { marginBottom: 20 },
  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #dddddd' },
  tableLabel: { width: '30%', backgroundColor: '#f5f5f5', padding: 8, fontSize: 10, color: '#555555' },
  tableValue: { width: '70%', padding: 8, fontSize: 10 },
  phaseTitle: { backgroundColor: '#1f2a44', color: '#ffffff', padding: '6 12', fontSize: 11, marginBottom: 8, marginTop: 16 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photo: { width: '31%', height: 120, objectFit: 'cover' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#aaaaaa' },
})

export async function POST(req: NextRequest) {
  try {
    const { projectId, userEmail } = await req.json()

    const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (!project) return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })

    const { data: photos } = await supabase.from('photos').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
    if (!photos || photos.length === 0) return NextResponse.json({ error: '写真がありません' }, { status: 400 })

    const getUrl = (path: string) =>
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`

    // 工程順に並べる
    const phaseOrder: string[] = project.phase_order ?? []
    const grouped: Record<string, typeof photos> = {}
    for (const p of photos) {
      const phase = p.phase || '未分類'
      if (!grouped[phase]) grouped[phase] = []
      grouped[phase].push(p)
    }
    const orderedPhases = [
      ...phaseOrder.filter(p => grouped[p]),
      ...Object.keys(grouped).filter(p => !phaseOrder.includes(p)),
    ]

    // 工程ごとに6枚ずつのページを生成
    type PhotoPage = { phase: string; photos: typeof photos; pageNum: number; totalPages: number }
    const photoPages: PhotoPage[] = []
    for (const phase of orderedPhases) {
      const phasePhotos = grouped[phase]
      const chunks: (typeof photos)[] = []
      for (let i = 0; i < phasePhotos.length; i += 6) chunks.push(phasePhotos.slice(i, i + 6))
      chunks.forEach((chunk, idx) => {
        photoPages.push({ phase, photos: chunk, pageNum: idx + 1, totalPages: chunks.length })
      })
    }

    // PDF生成
    const pdfBuffer = await renderToBuffer(
      <Document>
        {/* 表紙ページ */}
        <Page size="A4" style={styles.page}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.titleBox}>
              <Text style={styles.title}>完工報告書</Text>
              <Text style={styles.caseName}>{project.case_name}</Text>
              <Text style={styles.subText}>{project.work_type}</Text>
              {project.start_date && (
                <Text style={styles.subText}>工事期間：{project.start_date} 〜 {project.end_date || '未定'}</Text>
              )}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 40 }]}>工事概要</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>現場名</Text>
                <Text style={styles.tableValue}>{project.case_name}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>工事種類</Text>
                <Text style={styles.tableValue}>{project.work_type}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>施工地域</Text>
                <Text style={styles.tableValue}>{project.area}</Text>
              </View>
              {project.start_date && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>工事期間</Text>
                  <Text style={styles.tableValue}>{project.start_date} 〜 {project.end_date || '未定'}</Text>
                </View>
              )}
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>工程数</Text>
                <Text style={styles.tableValue}>{orderedPhases.length}工程</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>写真枚数</Text>
                <Text style={styles.tableValue}>{photos.length}枚</Text>
              </View>
            </View>
          </View>
          <Text style={styles.footer}>本書は CraftLog により自動生成されました</Text>
        </Page>

        {/* 施工写真ページ（工程ごと・6枚ずつ） */}
        {photoPages.map((pp, i) => (
          <Page key={i} size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>施工写真</Text>
            <Text style={styles.phaseTitle}>
              {pp.phase}（{pp.totalPages > 1 ? `${pp.pageNum}/${pp.totalPages} ` : ''}{grouped[pp.phase].length}枚）
            </Text>
            <View style={styles.photoGrid}>
              {pp.photos.map((p) => (
                <Image key={p.id} src={getUrl(p.storage_path)} style={styles.photo} />
              ))}
            </View>
            <Text style={styles.footer}>本書は CraftLog により自動生成されました</Text>
          </Page>
        ))}
      </Document>
    )

    // メール送信（PDF添付）
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: `【完工報告書】${project.case_name} ${project.work_type}`,
      html: `<p>${project.case_name}の完工報告書を添付にてお送りします。</p>`,
      attachments: [{
        filename: `完工報告書_${project.case_name}.pdf`,
        content: pdfBuffer,
      }],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
  }
}
