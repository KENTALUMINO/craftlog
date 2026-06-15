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

    // 写真を工程名でグループ化
    const grouped: Record<string, typeof photos> = {}
    for (const p of photos) {
      const phase = p.phase || '未分類'
      if (!grouped[phase]) grouped[phase] = []
      grouped[phase].push(p)
    }

    // カテゴリー対応の工程順を組み立てる
    // 順番：カテゴリー内工程（カテゴリー順）→ 未分類工程（phase_order順）
    type CategoryData = { id: string; name: string; phases: string[] }
    const savedCategories: CategoryData[] = Array.isArray(project.phase_categories) ? project.phase_categories : []
    const categorizedPhaseSet = new Set(savedCategories.flatMap((c: CategoryData) => c.phases))

    const phaseOrder: string[] = project.phase_order ?? []

    // カテゴリーに属する工程を先に並べる
    const categorizedPhases: string[] = savedCategories.flatMap((c: CategoryData) => c.phases).filter(p => grouped[p])
    // 未分類工程（phase_orderに従う）
    const uncategorizedPhases = [
      ...phaseOrder.filter(p => grouped[p] && !categorizedPhaseSet.has(p)),
      ...Object.keys(grouped).filter(p => !phaseOrder.includes(p) && !categorizedPhaseSet.has(p)),
    ]
    const orderedPhases = [...categorizedPhases, ...uncategorizedPhases]

    // 複数工程をbin-packingで1ページに詰め込む（合計6枚以内）
    // 7枚以上の工程は6枚ずつ分割してから詰め込む
    type PhaseChunk = { phase: string; photos: typeof photos; chunkNum: number; totalChunks: number }
    type PageGroup = { phases: PhaseChunk[]; totalPhotos: number }

    const allChunks: PhaseChunk[] = []
    for (const phase of orderedPhases) {
      const phasePhotos = grouped[phase]
      const totalChunks = Math.ceil(phasePhotos.length / 4)
      for (let i = 0; i < phasePhotos.length; i += 4) {
        allChunks.push({ phase, photos: phasePhotos.slice(i, i + 4), chunkNum: Math.floor(i / 4) + 1, totalChunks })
      }
    }

    const pageGroups: PageGroup[] = []
    let currentGroup: PageGroup = { phases: [], totalPhotos: 0 }
    for (const chunk of allChunks) {
      if (currentGroup.totalPhotos + chunk.photos.length > 4 && currentGroup.totalPhotos > 0) {
        pageGroups.push(currentGroup)
        currentGroup = { phases: [], totalPhotos: 0 }
      }
      currentGroup.phases.push(chunk)
      currentGroup.totalPhotos += chunk.photos.length
    }
    if (currentGroup.phases.length > 0) pageGroups.push(currentGroup)

    // 16:9横長固定レイアウト
    const GAP = 6
    const CONTENT_WIDTH = 515          // 595 - padding40*2
    const PHOTO_WIDTH = (CONTENT_WIDTH - GAP) / 2   // 2列固定: 254.5
    const PHOTO_HEIGHT = PHOTO_WIDTH * 9 / 16        // 16:9: ≈143pt

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

        {/* 施工写真ページ（複数工程をbin-packingで1ページに集約） */}
        {pageGroups.map((pg, i) => {
          // このページグループで表示する工程のカテゴリーヘッダーを判定
          let lastCategoryName: string | null = null
          return (
            <Page key={i} size="A4" style={styles.page}>
              <Text style={styles.sectionTitle}>施工写真</Text>
              {pg.phases.map((pc, pi) => {
                // このphaseが属するカテゴリーを探す
                const belongsToCategory = savedCategories.find((c: CategoryData) => c.phases.includes(pc.phase))
                const categoryName = belongsToCategory?.name ?? null

                // カテゴリーが変わったときだけヘッダーを表示
                const showCategoryHeader = categoryName && categoryName !== lastCategoryName
                if (categoryName) lastCategoryName = categoryName

                const label = `${pc.phase}${pc.totalChunks > 1 ? `（${pc.chunkNum}/${pc.totalChunks}）` : ''}　${grouped[pc.phase].length}枚`
                const rows: (typeof photos)[] = []
                for (let r = 0; r * 2 < pc.photos.length; r++) {
                  rows.push(pc.photos.slice(r * 2, r * 2 + 2))
                }
                return (
                  <View key={pi}>
                    {showCategoryHeader && (
                      <Text style={{
                        fontSize: 13,
                        fontFamily: 'NotoSansJP',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        backgroundColor: '#1f2a44',
                        padding: '8 12',
                        marginTop: pi > 0 ? 14 : 0,
                        marginBottom: 4,
                      }}>
                        ▍ {categoryName}
                      </Text>
                    )}
                    <Text style={styles.phaseTitle}>{label}</Text>
                    <View style={{ flexDirection: 'column', gap: GAP, marginBottom: pi < pg.phases.length - 1 ? 10 : 0 }}>
                      {rows.map((row, ri) => (
                        <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
                          {row.map((p) => (
                            <Image
                              key={p.id}
                              src={getUrl(p.storage_path)}
                              style={{ width: PHOTO_WIDTH, height: PHOTO_HEIGHT, objectFit: 'cover' }}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </Page>
          )
        })}
      </Document>
    )

    // 送信先：登録メール必須 + お客様メール（あれば追加）
    const toAddresses = [userEmail]
    if (project.customer_email && project.customer_email !== userEmail) {
      toAddresses.push(project.customer_email)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://craftlog.jp'
    const surveyUrl = `${siteUrl}/survey/${projectId}`

    await resend.emails.send({
      from: 'noreply@craftlog.jp',
      to: toAddresses,
      subject: `【完工報告書】${project.case_name} ${project.work_type}`,
      html: `
<p>${project.case_name}の完工報告書を添付にてお送りします。</p>
<p>工事はいかがでしたか？ぜひ以下のアンケートにご回答ください（1〜2分で完了します）。</p>
<p><a href="${surveyUrl}" style="display:inline-block;padding:12px 24px;background:#1f2a44;color:#ffffff;text-decoration:none;border-radius:4px;">アンケートに回答する</a></p>
<p style="color:#888888;font-size:12px;">上のボタンが開けない場合はこちら：${surveyUrl}</p>
`,
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
