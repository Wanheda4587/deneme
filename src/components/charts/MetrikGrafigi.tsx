import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MetricDef } from '../../lib/metrics.ts'
import type { NoktaSerisi } from '../../lib/stats.ts'
import { hareketliOrtalama } from '../../lib/stats.ts'
import { gunAdiKisa, kisaTarih, uzunTarih } from '../../lib/date.ts'
import { useTemaRenkleri } from '../../state/tema.ts'

interface Nokta {
  date: string
  ham: number | null
  ortalama: number | null
}

function Balon({
  aktif,
  yuk,
  def,
  ortalamaGoster,
}: {
  aktif?: boolean
  yuk?: { payload: Nokta }[]
  def: MetricDef
  ortalamaGoster: boolean
}) {
  if (!aktif || !yuk?.length) return null
  const n = yuk[0].payload
  const bicim = (v: number | null) => {
    if (v === null) return '—'
    if (def.type === 'bool') return v >= 0.5 ? 'Evet' : 'Hayır'
    return `${Number.isInteger(v) ? v : v.toFixed(1)}${def.birim ? ` ${def.birim}` : ''}`
  }
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-cizgi)', color: 'var(--c-ink)' }}
    >
      <div style={{ color: 'var(--c-ink-3)' }}>{uzunTarih(n.date)}</div>
      <div className="rakam font-semibold">{def.kisa}: {bicim(n.ham)}</div>
      {ortalamaGoster && n.ortalama !== null && (
        <div className="rakam" style={{ color: 'var(--c-ink-3)' }}>
          7 günlük ortalama: {bicim(n.ortalama)}
        </div>
      )}
    </div>
  )
}

/**
 * Bir metriğin gün gün grafiği.
 * - Biriken metrikler (sayfa, dakika) → bar: "hangi gün ne kadar" doğrudan okunur.
 * - Puan/oran metrikleri → çizgi + 7 günlük hareketli ortalama.
 */
export function MetrikGrafigi({
  def,
  seri,
  tip,
  yukseklik = 180,
  ters = false,
}: {
  def: MetricDef
  seri: NoktaSerisi[]
  tip: 'bar' | 'cizgi'
  yukseklik?: number
  /** true: bugün en solda, geriye doğru gider. false: kronolojik (eski → yeni). */
  ters?: boolean
}) {
  const renk = useTemaRenkleri()
  const sutunRenk = renk.sutun[def.pillar]
  const ortalamaSerisi = hareketliOrtalama(seri, 7)
  const veri: Nokta[] = seri.map((n, i) => ({
    date: n.date,
    ham: n.deger,
    ortalama: ortalamaSerisi[i].deger,
  }))

  const doluSayisi = seri.filter((n) => n.deger !== null).length
  if (doluSayisi === 0) {
    return (
      <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--c-ink-3)' }}>
        Bu metrik için henüz veri girilmedi.
      </p>
    )
  }

  const eksenStili = { fill: renk.ink3, fontSize: 11 }
  const etiketAralik = veri.length > 40 ? 13 : veri.length > 20 ? 6 : 2
  const xEtiketi = (d: string) => (veri.length > 8 ? kisaTarih(d) : gunAdiKisa(d))

  return (
    <div className="px-2 pb-2">
      <ResponsiveContainer width="100%" height={yukseklik}>
        {tip === 'bar' ? (
          <BarChart data={veri} margin={{ top: 8, right: 22, bottom: 0, left: -12 }} barCategoryGap="18%">
            <CartesianGrid stroke={renk.izgara} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" reversed={ters} tickFormatter={xEtiketi} tick={eksenStili} interval={etiketAralik} axisLine={{ stroke: renk.izgara }} tickLine={false} />
            <YAxis
              tick={eksenStili} axisLine={false} tickLine={false}
              width={def.type === 'bool' ? 54 : 44}
              domain={def.type === 'bool' ? [0, 1] : [0, 'auto']}
              ticks={def.type === 'bool' ? [0, 1] : undefined}
              tickFormatter={def.type === 'bool' ? (v: number) => (v >= 0.5 ? 'Evet' : 'Hayır') : undefined}
            />
            <Tooltip cursor={{ fill: renk.izgara }} content={<Balon def={def} ortalamaGoster={false} />} />
            {/* Veri uçları 4px yuvarlatılır, taban çizgisine oturur */}
            <Bar dataKey="ham" fill={sutunRenk} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={veri} margin={{ top: 8, right: 22, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={renk.izgara} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="date" reversed={ters} tickFormatter={xEtiketi} tick={eksenStili} interval={etiketAralik} axisLine={{ stroke: renk.izgara }} tickLine={false} />
            <YAxis tick={eksenStili} axisLine={false} tickLine={false} width={44} domain={def.type === 'scale' ? [0, 10] : def.type === 'percent' ? [0, 100] : ['auto', 'auto']} />
            <Tooltip cursor={{ stroke: renk.ink3, strokeWidth: 1 }} content={<Balon def={def} ortalamaGoster />} />
            {/* Ham günlük değer: ince, noktalı — tek tek günler görünsün */}
            <Line
              type="monotone" dataKey="ham" name="Günlük"
              stroke={sutunRenk} strokeWidth={1.5} strokeOpacity={0.45}
              dot={{ r: 2.5, fill: sutunRenk, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: sutunRenk, stroke: renk.kart, strokeWidth: 2 }}
              connectNulls={false} isAnimationActive={false}
            />
            {/* 7 günlük hareketli ortalama: kalın, sürekli — asıl trend çizgisi */}
            <Line
              type="monotone" dataKey="ortalama" name="7 günlük ortalama"
              stroke={sutunRenk} strokeWidth={2} dot={false}
              connectNulls isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {tip === 'cizgi' && (
        <div className="flex items-center gap-4 px-3 pt-1 text-xs" style={{ color: 'var(--c-ink-3)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ width: 14, height: 2, background: sutunRenk, opacity: 0.45, borderRadius: 1 }} />
            Günlük
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ width: 14, height: 2, background: sutunRenk, borderRadius: 1 }} />
            7 günlük ortalama
          </span>
        </div>
      )}
    </div>
  )
}
