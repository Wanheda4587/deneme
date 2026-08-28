import type { DayEntry } from '../lib/types.ts'
import { METRIKLER, SUTUN_HARITASI } from '../lib/metrics.ts'
import type { MetricDef } from '../lib/metrics.ts'
import {
  birikenMi,
  degisimYonu,
  haftaDegeri,
  haftaOzeti,
  sureBicimi,
  yuzdeDegisim,
} from '../lib/stats.ts'
import { gunEkle } from '../lib/date.ts'

function sayiBicimi(v: number | null, def: MetricDef): string {
  if (v === null) return '—'
  // Evet/Hayır metriği ortalama olarak 0-1 arası çıkar; gün oranı olarak okunur.
  if (def.type === 'bool') return `%${Math.round(v * 100)}`
  if (def.type === 'sure') return sureBicimi(v)
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1)
  // Yüzde işareti Türkçede başa gelir
  if (def.type === 'percent') return `%${s}`
  return def.birim ? `${s} ${def.birim}` : s
}

/**
 * Bu hafta ile geçen haftanın metrik metrik karşılaştırması.
 * Yön göstergesi renkle birlikte ok + metin taşır — anlam asla renge
 * tek başına bırakılmaz.
 */
export function HaftaKarsilastirma({
  haftaBasiIso,
  kayitlar,
  gizli,
}: {
  haftaBasiIso: string
  kayitlar: Map<string, DayEntry>
  gizli: Set<string>
}) {
  const oncekiHafta = gunEkle(haftaBasiIso, -7)
  const satirlar = METRIKLER.filter((m) => !gizli.has(m.id)).map((def) => {
    const bu = haftaDegeri(haftaOzeti(haftaBasiIso, kayitlar, def.id), def.id)
    const gecen = haftaDegeri(haftaOzeti(oncekiHafta, kayitlar, def.id), def.id)
    const fark = bu !== null && gecen !== null ? bu - gecen : null
    const yuzde = yuzdeDegisim(gecen, bu)
    return { def, bu, gecen, fark, yuzde, yon: degisimYonu(def, fark) }
  })

  const veriVar = satirlar.some((s) => s.bu !== null || s.gecen !== null)
  if (!veriVar) {
    return (
      <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
        Bu hafta ve geçen hafta için henüz veri yok. Birkaç gün giriş yaptıktan sonra
        karşılaştırma burada oluşur.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <caption className="gizli-metin">
          Metrik bazında bu hafta ile geçen haftanın karşılaştırması
        </caption>
        <thead>
          <tr style={{ color: 'var(--c-ink-3)' }}>
            <th scope="col" className="text-left font-medium py-2 px-3">Metrik</th>
            <th scope="col" className="text-right font-medium py-2 px-3 whitespace-nowrap">Bu hafta</th>
            <th scope="col" className="text-right font-medium py-2 px-3 whitespace-nowrap">Geçen</th>
            <th scope="col" className="text-right font-medium py-2 px-3 whitespace-nowrap">Değişim</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map(({ def, bu, gecen, fark, yuzde, yon }) => {
            const sutun = SUTUN_HARITASI[def.pillar]
            const renk =
              yon === 'iyi' ? 'var(--d-iyi)' : yon === 'kotu' ? 'var(--d-kotu)' : 'var(--c-ink-3)'
            const ok = fark === null || fark === 0 ? '→' : fark > 0 ? '↑' : '↓'
            return (
              <tr key={def.id} style={{ borderTop: '1px solid var(--c-cizgi)' }}>
                <th scope="row" className="text-left font-normal py-2 px-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block shrink-0"
                      style={{
                        width: 8, height: 8, borderRadius: 2,
                        background: `var(--p-${sutun.id})`,
                      }}
                    />
                    <span className="truncate">{def.kisa}</span>
                  </span>
                </th>
                <td className="text-right py-2 px-3 rakam font-semibold whitespace-nowrap">
                  {sayiBicimi(bu, def)}
                </td>
                <td className="text-right py-2 px-3 rakam whitespace-nowrap" style={{ color: 'var(--c-ink-3)' }}>
                  {sayiBicimi(gecen, def)}
                </td>
                <td className="text-right py-2 px-3 whitespace-nowrap" style={{ color: renk }}>
                  {fark === null ? (
                    <span style={{ color: 'var(--c-ink-3)' }}>—</span>
                  ) : (
                    <span className="rakam">
                      <span aria-hidden="true">{ok}</span>{' '}
                      {yuzde !== null
                        ? `%${Math.abs(yuzde).toFixed(0)}`
                        : `${fark > 0 ? '+' : ''}${Number.isInteger(fark) ? fark : fark.toFixed(1)}`}
                      <span className="gizli-metin">
                        {yon === 'iyi' ? ' (iyi yönde)' : yon === 'kotu' ? ' (kötü yönde)' : ''}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="ipucu px-3 pb-3">
        Süre ve sayfa gibi biriken metrikler haftalık <strong>toplam</strong>, puanlar haftalık{' '}
        <strong>ortalama</strong> olarak karşılaştırılır.{' '}
        {METRIKLER.filter((m) => birikenMi(m.id)).map((m) => m.kisa).join(', ')} → toplam.
      </p>
    </div>
  )
}
