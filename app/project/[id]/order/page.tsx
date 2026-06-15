'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Category = { id: string; name: string; phases: string[] }
type Project = {
  id: string; case_name: string; work_type: string; area: string
  phase_order: string[] | null
  phase_categories: Category[] | null
}

const STEPS = ['工程管理', '並び替え', '完工報告書', 'ブログ']

const StepBar = ({ current }: { current: number }) => (
  <div style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-3">
    <div className="flex items-center max-w-2xl mx-auto">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i < current ? 'cl-step-done' : i === current ? 'cl-step-active' : 'cl-step-idle'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{
              color: i === current ? 'var(--cl-orange)' : i < current ? 'var(--cl-green)' : 'var(--cl-text-muted)'
            }}>{step}</span>
          </div>
          {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: 'var(--cl-border)' }} />}
        </div>
      ))}
    </div>
  </div>
)

// 工程の写真サムネイルを横並びで表示するコンポーネント
const PhaseThumbs = ({ paths, getUrl, onClickPhoto }: {
  paths: string[]
  getUrl: (p: string) => string
  onClickPhoto: (url: string) => void
}) => (
  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
    {paths.slice(0, 5).map((path, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={i} src={getUrl(path)} alt=""
        onClick={e => { e.stopPropagation(); onClickPhoto(getUrl(path)) }}
        className="w-16 h-12 object-cover rounded flex-shrink-0 cursor-pointer"
        style={{ border: '1px solid var(--cl-border)' }} />
    ))}
    {paths.length > 5 && (
      <div className="w-16 h-12 rounded flex-shrink-0 flex items-center justify-center text-xs font-medium"
        style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', color: 'var(--cl-text-muted)' }}>
        +{paths.length - 5}枚
      </div>
    )}
  </div>
)

export default function OrderPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [allPhases, setAllPhases] = useState<string[]>([])
  const [photosByPhase, setPhotosByPhase] = useState<Record<string, string[]>>({})
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const getThumbUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/photos/${path}`
  const [categories, setCategories] = useState<Category[]>([])
  // 未分類の工程の順番（タップで決める）
  const [uncatOrdered, setUncatOrdered] = useState<string[]>([])
  // カテゴリー内の工程の順番 { catId: ordered phases[] }
  const [catOrders, setCatOrders] = useState<Record<string, string[]>>({})
  const [mode, setMode] = useState<'organize' | 'order'>('organize')
  const [saving, setSaving] = useState(false)
  const [normalizing, setNormalizing] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // 工程名の変更
  const [renamingPhase, setRenamingPhase] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // カテゴリー追加
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // カテゴリー名の変更
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null)
  const [renameCatValue, setRenameCatValue] = useState('')

  // カテゴリーへの割り当て（モーダル）
  const [assigningPhase, setAssigningPhase] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
      if (proj) {
        setProject(proj)
        const savedCats: Category[] = Array.isArray(proj.phase_categories) ? proj.phase_categories : []
        setCategories(savedCats)
        // catOrders は各カテゴリーの phases をそのまま初期値にする
        const initialCatOrders: Record<string, string[]> = {}
        for (const c of savedCats) initialCatOrders[c.id] = c.phases ?? []
        setCatOrders(initialCatOrders)
        if (Array.isArray(proj.phase_order)) setUncatOrdered(proj.phase_order)
      }

      const { data: photos } = await supabase.from('photos').select('phase, phase_category, storage_path').eq('project_id', id)
      if (photos) {
        const detected = [...new Set(photos.map(p => p.phase).filter(Boolean))] as string[]
        setAllPhases(detected)

        // 工程×場所のコンポジットキーで写真をまとめる（同名工程が別場所に混在しないよう分離）
        const grouped: Record<string, string[]> = {}
        for (const p of photos) {
          if (!p.phase || !p.storage_path) continue
          const key = p.phase_category ? `${p.phase}@@@${p.phase_category}` : p.phase
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(p.storage_path)
        }
        setPhotosByPhase(grouped)

        // カテゴリーが未設定なら、phase_categoryから自動生成
        const hasSavedCats = proj && Array.isArray(proj.phase_categories) && proj.phase_categories.length > 0
        if (!hasSavedCats) {
          // 各工程が最も多く属するカテゴリーを票数で決定
          const phaseCatVotes: Record<string, Record<string, number>> = {}
          for (const p of photos) {
            if (!p.phase || !p.phase_category) continue
            if (!phaseCatVotes[p.phase]) phaseCatVotes[p.phase] = {}
            phaseCatVotes[p.phase][p.phase_category] = (phaseCatVotes[p.phase][p.phase_category] ?? 0) + 1
          }
          const catNames = [...new Set(photos.map(p => p.phase_category).filter(Boolean))] as string[]
          if (catNames.length > 0) {
            const autoCats: Category[] = catNames.map((name, i) => ({
              id: `cat-auto-${Date.now()}-${i}`,
              name,
              phases: [] as string[],
            }))
            for (const phase of detected) {
              if (!phaseCatVotes[phase]) continue
              const [primaryEntry] = Object.entries(phaseCatVotes[phase]).sort(([, a], [, b]) => b - a)
              const cat = autoCats.find(c => c.name === primaryEntry[0])
              if (cat) cat.phases.push(phase)
            }
            setCategories(autoCats)
            const initialCatOrders: Record<string, string[]> = {}
            for (const c of autoCats) initialCatOrders[c.id] = c.phases
            setCatOrders(initialCatOrders)
          }
        }
      }
    }
    init()
  }, [id])

  // 工程名＋カテゴリー名で正しい写真パスを取得するヘルパー
  const getPhotosByPhaseAndCat = (phase: string, catName?: string) => {
    if (catName) {
      const compositeKey = `${phase}@@@${catName}`
      if (photosByPhase[compositeKey]) return photosByPhase[compositeKey]
    }
    // カテゴリーなし or コンポジットキーが存在しない場合は全マッチをマージ
    return Object.entries(photosByPhase)
      .filter(([k]) => k === phase || k.startsWith(`${phase}@@@`))
      .flatMap(([, paths]) => paths)
  }

  const categorizedSet = new Set(categories.flatMap(c => c.phases))
  const uncategorized = allPhases.filter(p => !categorizedSet.has(p))

  // AI自動整理
  const handleNormalize = async () => {
    if (!confirm('AIが工程名を自動で整理します。\n似た名前をまとめ、案件名・場所名を削除します。\n\nよろしいですか？')) return
    setNormalizing(true)
    try {
      const res = await fetch('/api/normalize-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      const data = await res.json()
      if (data.error) { alert('エラー：' + data.error); return }

      // 画面のデータを更新（リロードせずに反映）
      const mapping: Record<string, string> = data.mapping
      setAllPhases(prev => {
        const renamed = prev.map(p => mapping[p] ?? p)
        return [...new Set(renamed)]
      })
      setCategories(prev => prev.map(c => ({ ...c, phases: [...new Set(c.phases.map(p => mapping[p] ?? p))] })))
      setCatOrders(prev => {
        const n: Record<string, string[]> = {}
        for (const k in prev) n[k] = [...new Set(prev[k].map(p => mapping[p] ?? p))]
        return n
      })
      setUncatOrdered(prev => [...new Set(prev.map(p => mapping[p] ?? p))])
      setPhotosByPhase(prev => {
        const n: Record<string, string[]> = {}
        for (const [phase, paths] of Object.entries(prev)) {
          const newPhase = mapping[phase] ?? phase
          n[newPhase] = [...(n[newPhase] ?? []), ...paths]
        }
        return n
      })
      alert(`完了！${data.updatedCount}件の工程名を整理しました。`)
    } finally {
      setNormalizing(false)
    }
  }

  // ---- 整理モード操作 ----

  const handleRename = async () => {
    if (!renamingPhase) return
    const newName = renameValue.trim()
    if (!newName || newName === renamingPhase) { setRenamingPhase(null); return }
    const oldName = renamingPhase

    await supabase.from('photos').update({ phase: newName }).eq('project_id', id).eq('phase', oldName)
    setAllPhases(prev => prev.map(p => p === oldName ? newName : p))
    setCategories(prev => prev.map(c => ({ ...c, phases: c.phases.map(p => p === oldName ? newName : p) })))
    setCatOrders(prev => {
      const next: Record<string, string[]> = {}
      for (const k in prev) next[k] = prev[k].map(p => p === oldName ? newName : p)
      return next
    })
    setUncatOrdered(prev => prev.map(p => p === oldName ? newName : p))
    setRenamingPhase(null)
  }

  const handleAddCat = () => {
    if (!newCatName.trim()) return
    const newCat: Category = { id: `cat-${Date.now()}`, name: newCatName.trim(), phases: [] }
    setCategories(prev => [...prev, newCat])
    setCatOrders(prev => ({ ...prev, [newCat.id]: [] }))
    setNewCatName('')
    setAddingCat(false)
  }

  const handleDeleteCat = (catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId))
    setCatOrders(prev => { const n = { ...prev }; delete n[catId]; return n })
  }

  const handleRenameCategory = () => {
    if (!renamingCatId || !renameCatValue.trim()) { setRenamingCatId(null); return }
    setCategories(prev => prev.map(c => c.id === renamingCatId ? { ...c, name: renameCatValue.trim() } : c))
    setRenamingCatId(null)
  }

  const handleAssign = (phase: string, catId: string) => {
    // 他のカテゴリーから外す
    setCategories(prev => prev.map(c => ({ ...c, phases: c.phases.filter(p => p !== phase) })))
    setCatOrders(prev => {
      const n = { ...prev }
      for (const k in n) n[k] = n[k].filter(p => p !== phase)
      return n
    })
    // 対象カテゴリーに追加
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, phases: [...c.phases, phase] } : c))
    setCatOrders(prev => ({ ...prev, [catId]: [...(prev[catId] ?? []), phase] }))
    // 未分類の順番からも外す
    setUncatOrdered(prev => prev.filter(p => p !== phase))
    setAssigningPhase(null)
  }

  const handleRemoveFromCat = (phase: string, catId: string) => {
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, phases: c.phases.filter(p => p !== phase) } : c))
    setCatOrders(prev => ({ ...prev, [catId]: (prev[catId] ?? []).filter(p => p !== phase) }))
  }

  // ---- 順番モード操作 ----

  const handleTapUncat = (phase: string) => {
    if (uncatOrdered.includes(phase)) {
      setUncatOrdered(prev => prev.slice(0, prev.indexOf(phase)))
    } else {
      setUncatOrdered(prev => [...prev, phase])
    }
  }

  const handleTapCatPhase = (catId: string, phase: string) => {
    const current = catOrders[catId] ?? []
    if (current.includes(phase)) {
      setCatOrders(prev => ({ ...prev, [catId]: prev[catId].slice(0, prev[catId].indexOf(phase)) }))
    } else {
      setCatOrders(prev => ({ ...prev, [catId]: [...(prev[catId] ?? []), phase] }))
    }
  }

  // ---- 保存 ----

  const handleSave = async () => {
    setSaving(true)
    // categories の phases を catOrders（順番つき）で上書きして保存
    const finalCategories = categories.map(c => ({ ...c, phases: catOrders[c.id] ?? c.phases }))
    await supabase.from('projects').update({
      phase_order: uncatOrdered,
      phase_categories: finalCategories,
    }).eq('id', id)
    setSaving(false)
    router.push(`/project/${id}/report`)
  }

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>
      読み込み中...
    </div>
  )

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--cl-bg)' }}>
      <header style={{ background: 'var(--cl-surface)', borderBottom: '1px solid var(--cl-border)' }} className="px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push(`/project/${id}`)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
          style={{ color: 'var(--cl-orange)', background: 'var(--cl-orange-light)' }}>
          ← 前の手順へ
        </button>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--cl-text)' }}>{project.case_name}</h1>
          <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>{project.work_type}　{project.area}</p>
        </div>
      </header>

      <StepBar current={1} />

      {/* モード切り替えタブ */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--cl-border)' }}>
          <button onClick={() => setMode('organize')} className="flex-1 py-2.5 text-sm font-medium transition"
            style={mode === 'organize'
              ? { background: 'var(--cl-orange)', color: '#fff' }
              : { background: 'var(--cl-surface)', color: 'var(--cl-text-muted)' }}>
            ① 整理する
          </button>
          <button onClick={() => setMode('order')} className="flex-1 py-2.5 text-sm font-medium transition"
            style={mode === 'order'
              ? { background: 'var(--cl-orange)', color: '#fff' }
              : { background: 'var(--cl-surface)', color: 'var(--cl-text-muted)' }}>
            ② 順番を決める
          </button>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ========== 整理モード ========== */}
        {mode === 'organize' && (
          <>
            <button onClick={handleNormalize} disabled={normalizing}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'var(--cl-navy, #1f2a44)', color: '#fff' }}>
              {normalizing ? '整理中...' : '✨ AIで工程名を自動整理する'}
            </button>
            <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>
              工程名を変えたり、カテゴリーにまとめたりできます。
            </p>

            {/* 未分類の工程 */}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--cl-text-sub)' }}>
                未分類の工程（{uncategorized.length}件）
              </p>
              <div className="space-y-2">
                {uncategorized.length === 0 && (
                  <p className="text-xs py-3 text-center" style={{ color: 'var(--cl-text-muted)' }}>全工程がカテゴリーに割り当てられています</p>
                )}
                {uncategorized.map(phase => (
                  <div key={phase} className="rounded-xl px-4 py-3"
                    style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)' }}>
                    {renamingPhase === phase ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRename()}
                          className="flex-1 text-sm px-2 py-1 rounded-lg outline-none"
                          style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-orange)', color: 'var(--cl-text)' }}
                        />
                        <button onClick={handleRename}
                          className="text-xs px-3 py-1 rounded-lg font-medium"
                          style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                          確定
                        </button>
                        <button onClick={() => setRenamingPhase(null)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: 'var(--cl-text-muted)' }}>
                          戻す
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--cl-text)' }}>
                            {phase}
                            <span className="ml-1.5 text-xs" style={{ color: 'var(--cl-text-muted)' }}>
                              {getPhotosByPhaseAndCat(phase).length}枚
                            </span>
                          </span>
                          <button onClick={() => { setRenamingPhase(phase); setRenameValue(phase) }}
                            className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                            style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)', border: '1px solid var(--cl-border)' }}>
                            ✏ 名前変更
                          </button>
                          {categories.length > 0 && (
                            <button onClick={() => setAssigningPhase(phase)}
                              className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                              style={{ background: 'var(--cl-bg)', color: 'var(--cl-orange)', border: '1px solid var(--cl-orange)' }}>
                              📁 移動
                            </button>
                          )}
                        </div>
                        <PhaseThumbs paths={getPhotosByPhaseAndCat(phase)} getUrl={getThumbUrl} onClickPhoto={setLightboxUrl} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* カテゴリー一覧 */}
            {categories.map(cat => (
              <div key={cat.id} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--cl-border)' }}>
                {/* カテゴリーヘッダー */}
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ background: 'var(--cl-navy, #1f2a44)' }}>
                  {renamingCatId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        autoFocus
                        value={renameCatValue}
                        onChange={e => setRenameCatValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameCategory()}
                        className="flex-1 text-sm px-2 py-1 rounded-lg outline-none"
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}
                      />
                      <button onClick={handleRenameCategory}
                        className="text-xs px-3 py-1 rounded-lg font-medium"
                        style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                        確定
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-bold text-white">{cat.name}</span>
                      <button onClick={() => { setRenamingCatId(cat.id); setRenameCatValue(cat.name) }}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                        ✏
                      </button>
                      <button onClick={() => handleDeleteCat(cat.id)}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(255,100,100,0.3)', color: '#fff' }}>
                        × 削除
                      </button>
                    </>
                  )}
                </div>
                {/* カテゴリー内の工程 */}
                <div className="divide-y" style={{ borderColor: 'var(--cl-border)' }}>
                  {cat.phases.length === 0 && (
                    <p className="text-xs px-4 py-3" style={{ color: 'var(--cl-text-muted)' }}>
                      まだ工程がありません。未分類の工程から「📁 移動」で追加してください。
                    </p>
                  )}
                  {cat.phases.map(phase => (
                    <div key={phase} className="px-4 py-3"
                      style={{ background: 'var(--cl-surface)' }}>
                      {renamingPhase === phase ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRename()}
                            className="flex-1 text-sm px-2 py-1 rounded-lg outline-none"
                            style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-orange)', color: 'var(--cl-text)' }}
                          />
                          <button onClick={handleRename}
                            className="text-xs px-3 py-1 rounded-lg font-medium"
                            style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                            確定
                          </button>
                          <button onClick={() => setRenamingPhase(null)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ color: 'var(--cl-text-muted)' }}>
                            戻す
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm" style={{ color: 'var(--cl-text)' }}>
                              {phase}
                              <span className="ml-1.5 text-xs" style={{ color: 'var(--cl-text-muted)' }}>
                                {getPhotosByPhaseAndCat(phase, cat.name).length}枚
                              </span>
                            </span>
                            <button onClick={() => { setRenamingPhase(phase); setRenameValue(phase) }}
                              className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                              style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)', border: '1px solid var(--cl-border)' }}>
                              ✏
                            </button>
                            <button onClick={() => handleRemoveFromCat(phase, cat.id)}
                              className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                              style={{ color: 'var(--cl-text-muted)' }}>
                              ← 外す
                            </button>
                          </div>
                          <PhaseThumbs paths={getPhotosByPhaseAndCat(phase, cat.name)} getUrl={getThumbUrl} onClickPhoto={setLightboxUrl} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* カテゴリー追加ボタン */}
            {addingCat ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="カテゴリー名（例：長尺シート工事）"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCat()}
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-orange)', color: 'var(--cl-text)' }}
                />
                <button onClick={handleAddCat}
                  className="text-sm px-4 py-2.5 rounded-xl font-medium"
                  style={{ background: 'var(--cl-orange)', color: '#fff' }}>
                  追加
                </button>
                <button onClick={() => { setAddingCat(false); setNewCatName('') }}
                  className="text-sm px-3 py-2.5 rounded-xl"
                  style={{ color: 'var(--cl-text-muted)' }}>
                  戻す
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingCat(true)}
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ border: '1.5px dashed var(--cl-border)', color: 'var(--cl-orange)', background: 'transparent' }}>
                ＋ カテゴリーを追加する
              </button>
            )}
          </>
        )}

        {/* ========== 順番モード ========== */}
        {mode === 'order' && (
          <>
            <p className="text-xs" style={{ color: 'var(--cl-text-muted)' }}>
              施工した順番にタップしてください。もう一度タップするとその番号以降がリセットされます。
            </p>

            {/* カテゴリーごとの順番 */}
            {categories.map(cat => {
              const ordered = catOrders[cat.id] ?? []
              const unordered = cat.phases.filter(p => !ordered.includes(p))
              return (
                <div key={cat.id}>
                  <div className="px-3 py-2 rounded-t-xl text-sm font-bold text-white"
                    style={{ background: 'var(--cl-navy, #1f2a44)' }}>
                    {cat.name}
                  </div>
                  <div className="rounded-b-xl overflow-hidden space-y-0"
                    style={{ border: '1px solid var(--cl-border)', borderTop: 'none' }}>
                    {[...ordered, ...unordered].map(phase => {
                      const idx = ordered.indexOf(phase)
                      const isOrdered = idx !== -1
                      return (
                        <button key={phase} onClick={() => handleTapCatPhase(cat.id, phase)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b last:border-b-0"
                          style={isOrdered
                            ? { background: 'var(--cl-orange)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }
                            : { background: 'var(--cl-surface)', borderColor: 'var(--cl-border)', color: 'var(--cl-text)' }}>
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={isOrdered
                              ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                              : { background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>
                            {isOrdered ? idx + 1 : ''}
                          </span>
                          <span className="font-medium text-sm">{phase}</span>
                        </button>
                      )
                    })}
                    {cat.phases.length === 0 && (
                      <p className="text-xs px-4 py-3" style={{ color: 'var(--cl-text-muted)', background: 'var(--cl-surface)' }}>
                        工程がありません
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* 未分類の順番 */}
            {uncategorized.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--cl-text-sub)' }}>未分類</p>
                <div className="space-y-2">
                  {[...uncatOrdered, ...uncategorized.filter(p => !uncatOrdered.includes(p))].map(phase => {
                    const idx = uncatOrdered.indexOf(phase)
                    const isOrdered = idx !== -1
                    return (
                      <button key={phase} onClick={() => handleTapUncat(phase)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                        style={isOrdered
                          ? { background: 'var(--cl-orange)', border: '1px solid var(--cl-orange)', color: '#fff' }
                          : { background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', color: 'var(--cl-text)' }}>
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={isOrdered
                            ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                            : { background: 'var(--cl-bg)', color: 'var(--cl-text-muted)' }}>
                          {isOrdered ? idx + 1 : ''}
                        </span>
                        <span className="font-medium text-sm">{phase}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="cl-btn-primary">
              {saving ? '保存中...' : 'この順番で確定して次へ →'}
            </button>
          </>
        )}
      </main>

      {/* 写真拡大表示（ライトボックス） */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            ✕
          </button>
        </div>
      )}

      {/* カテゴリー割り当てモーダル */}
      {assigningPhase && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setAssigningPhase(null)}>
          <div className="w-full rounded-t-2xl p-5 space-y-3 max-h-[70vh] overflow-y-auto"
            style={{ background: 'var(--cl-surface)' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold" style={{ color: 'var(--cl-text)' }}>
              「{assigningPhase}」をどのカテゴリーに追加しますか？
            </p>
            {categories.map(c => (
              <button key={c.id} onClick={() => handleAssign(assigningPhase, c.id)}
                className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium"
                style={{ background: 'var(--cl-bg)', color: 'var(--cl-text)', border: '1px solid var(--cl-border)' }}>
                {c.name}
              </button>
            ))}
            <button onClick={() => setAssigningPhase(null)}
              className="w-full px-4 py-3 text-sm"
              style={{ color: 'var(--cl-text-muted)' }}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
