import { useEffect, useState } from 'react'
import { Kart } from '../components/ui/Kart.tsx'
import { MetrikGrafigi } from '../components/charts/MetrikGrafigi.tsx'
import { METRIKLER, SUTUNLAR } from '../lib/metrics.ts'
import type { MetrikId } from '../lib/metrics.ts'
import type { Pillar } from '../lib/types.ts'
import { bugun as bugunIso, gunEkle, gunFarki, kampGunleri } from '../lib/date.ts'
import { birikenMi, degisimYonu, metrikSerisi, ortalama, sureBicimi, toplam } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

type Aralik = 14 | 30 | 0 // 0 = tüm kamp

export function Trendler() {
  const { gunler, ayarlar } = useStore()
  const [aralik, setAralik] = useState<Aralik>(14)
  const [sutunFiltre, setSutunFiltre] = useState<Pillar | 'hepsi'>('hepsi')
  const [tamEkran, setTamEkran] = useState<MetrikId | null>(null)

  // Tam ekran açıkken Esc ile kapansın, arkadaki sayfa kaymasın
  useEffect(() => {
    if (!tamEkran) return
    const kapat = (e: KeyboardEvent) => e.key === 'Escape' && setTamEkran(null)
    window.addEventListener('keydown', kapat)
    const eskiTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', kapat)
      document.body.style.overflow = eskiTasma
    }
  }, [tamEkran])

  const { kampBaslangic, kampGunSayisi } = ayarlar
  const gizli = new Set(ayarlar.gizliMetrikler)

  // Gösterilecek gün penceresi
  const tumGunler = kampGunleri(kampBaslangic, kampGunSayisi)
  const bugunStr = bugunIso()
  const pencere =
    aralik === 0
      ? tumGunler
      : Array.from({ length: aralik }, (_, i) => gunEkle(bugunStr, -(aralik - 1 - i)))

  const metrikler = METRIKLER.filter(
    (m) => !gizli.has(m.id) && (sutunFiltre === 'hepsi' || m.pillar === sutunFiltre),
  )

  // İlk 2 hafta ↔ son 2 hafta: kampın işe yarayıp yaramadığının en dürüst testi
  const gecenGun = Math.min(Math.max(gunFarki(kampBaslangic, bugunStr) + 1, 0), kampGunSayisi)
  const ilk14 = tumGunler.slice(0, 14)
  const son14 = tumGunler.slice(Math.max(0, gecenGun - 14), gecenGun)
  const donemKarsilastirmasiVar = gecenGun >= 28

  return (
    <div className="flex flex-col gap-4">
      {/* Filtreler — tek satır, grafiklerin üstünde */}
      <div className="kart p-3 flex flex-col gap-3">
        <div className="flex gap-2" role="group" aria-label="Zaman aralığı">
          {([14, 30, 0] as Aralik[]).map((a) => (
            <button
              key={a}
              type="button"
              className="dugme flex-1 text-sm"
              aria-pressed={aralik === a}
              style={
                aralik === a
                  ? { background: 'var(--c-ink)', color: 'var(--c-bg)', borderColor: 'var(--c-ink)' }
                  : undefined
              }
              onClick={() => setAralik(a)}
            >
              {a === 0 ? 'Tüm kamp' : `Son ${a} gün`}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Sütun filtresi">
          <button
            type="button"
            className="dugme text-sm whitespace-nowrap"
            aria-pressed={sutunFiltre === 'hepsi'}
            style={sutunFiltre === 'hepsi' ? { borderColor: 'var(--c-ink-3)' } : undefined}
            onClick={() => setSutunFiltre('hepsi')}
          >
            Hepsi
          </button>
          {SUTUNLAR.map((s) => (
            <button
              key={s.id}
              type="button"
              className="dugme text-sm whitespace-nowrap"
              aria-pressed={sutunFiltre === s.id}
              style={sutunFiltre === s.id ? { borderColor: `var(--p-${s.id})` } : undefined}
              onClick={() => setSutunFiltre(s.id)}
            >
              <span aria-hidden="true">{s.ikon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dönem karşılaştırması */}
      {donemKarsilastirmasiVar && (
        <Kart baslik="İlk 2 hafta ↔ son 2 hafta" ikon="⚖️">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--c-ink-3)' }}>
                  <th scope="col" className="text-left font-medium py-2 px-3">Metrik</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">İlk 2 hafta</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">Son 2 hafta</th>
                </tr>
              </thead>
              <tbody>
                {metrikler.map((def) => {
                  const hesap = (g: string[]) => {
                    const d = metrikSerisi(g, gunler, def.id).map((n) => n.deger)
                    return birikenMi(def.id) ? toplam(d) : ortalama(d)
                  }
                  const a = hesap(ilk14)
                  const b = hesap(son14)
                  const fark = a !== null && b !== null ? b - a : null
                  const yon = degisimYonu(def, fark)
                  const renk = yon === 'iyi' ? 'var(--d-iyi)' : yon === 'kotu' ? 'var(--d-kotu)' : 'var(--c-ink)'
                  const bic = (v: number | null) =>
                    v === null
                      ? '—'
                      : def.type === 'bool'
                        ? `%${Math.round(v * 100)}`
                        : Number.isInteger(v)
                          ? String(v)
                          : v.toFixed(1)
                  return (
                    <tr key={def.id} style={{ borderTop: '1px solid var(--c-cizgi)' }}>
                      <th scope="row" className="text-left font-normal py-2 px-3">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="inline-block shrink-0" style={{ width: 8, height: 8, borderRadius: 2, background: `var(--p-${def.pillar})` }} />
                          {def.kisa}
                        </span>
                      </th>
                      <td className="text-right py-2 px-3 rakam" style={{ color: 'var(--c-ink-3)' }}>{bic(a)}</td>
                      <td className="text-right py-2 px-3 rakam font-semibold" style={{ color: renk }}>
                        {bic(b)}
                        {fark !== null && fark !== 0 && (
                          <span aria-hidden="true"> {fark > 0 ? '↑' : '↓'}</span>
                        )}
                        <span className="gizli-metin">
                          {yon === 'iyi' ? ' iyi yönde' : yon === 'kotu' ? ' kötü yönde' : ''}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Kart>
      )}

      {/* Metrik grafikleri */}
      {metrikler.map((def) => {
        const seri = metrikSerisi(pencere, gunler, def.id)
        const degerler = seri.map((n) => n.deger)
        const biriken = birikenMi(def.id)
        const ozet = biriken
          ? `toplam ${Math.round(toplam(degerler))}${def.birim ? ` ${def.birim}` : ''}`
          : def.type === 'bool'
            ? `${degerler.filter((d) => d === 1).length} gün`
            : (() => {
                const o = ortalama(degerler)
                if (o === null) return '—'
                if (def.type === 'sure') return `ort. ${sureBicimi(o)}`
                // Yüzde işareti Türkçede başa gelir
                if (def.type === 'percent') return `ort. %${o.toFixed(1)}`
                return `ort. ${o.toFixed(1)}${def.birim ? ` ${def.birim}` : ''}`
              })()

        return (
          <Kart
            key={def.id}
            baslik={def.label}
            ikon={SUTUNLAR.find((s) => s.id === def.pillar)?.ikon}
            pillar={def.pillar}
            sag={
              <span className="flex items-center gap-2">
                <span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>{ozet}</span>
                <button
                  type="button"
                  className="dugme px-2 py-1 text-xs"
                  aria-label={`${def.label} grafiğini tam ekran aç`}
                  onClick={() => setTamEkran(def.id)}
                >
                  ⛶
                </button>
              </span>
            }
          >
            <MetrikGrafigi
              def={def}
              seri={seri}
              tip={biriken || def.type === 'bool' ? 'bar' : 'cizgi'}
            />
          </Kart>
        )
      })}

      {metrikler.length === 0 && (
        <p className="kart p-6 text-center text-sm" style={{ color: 'var(--c-ink-3)' }}>
          Bu sütunda görünür metrik yok.
        </p>
      )}

      {tamEkran && (
        <TamEkranGrafik
          metrikId={tamEkran}
          gunler={tumGunler.filter((g) => g <= bugunStr)}
          kayitlar={gunler}
          onKapat={() => setTamEkran(null)}
        />
      )}
    </div>
  )
}

/**
 * Tek metriğin tüm kamp boyunca görünümü. Buradaki eksen kronolojiktir:
 * en solda kamp başlangıcı, sağa doğru bugüne gelir.
 */
function TamEkranGrafik({
  metrikId,
  gunler,
  kayitlar,
  onKapat,
}: {
  metrikId: MetrikId
  gunler: string[]
  kayitlar: Map<string, import('../lib/types.ts').DayEntry>
  onKapat: () => void
}) {
  const def = METRIKLER.find((m) => m.id === metrikId)
  if (!def) return null
  const seri = metrikSerisi(gunler, kayitlar, metrikId)
  const degerler = seri.map((n) => n.deger).filter((v): v is number => v !== null)
  const biriken = birikenMi(metrikId)
  const ozet =
    degerler.length === 0
      ? '—'
      : biriken
        ? `toplam ${Math.round(toplam(degerler))}${def.birim ? ` ${def.birim}` : ''}`
        : def.type === 'bool'
          ? `${degerler.filter((d) => d === 1).length} gün`
          : def.type === 'sure'
            ? `ort. ${sureBicimi(ortalama(degerler))}`
            : def.type === 'percent'
              ? `ort. %${(ortalama(degerler) ?? 0).toFixed(1)}`
              : `ort. ${(ortalama(degerler) ?? 0).toFixed(1)}${def.birim ? ` ${def.birim}` : ''}`

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${def.label} — tüm kamp`}
      style={{ background: 'var(--c-bg)' }}
    >
      <header
        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--c-cizgi)' }}
      >
        <span
          aria-hidden="true"
          className="inline-block shrink-0"
          style={{ width: 10, height: 10, borderRadius: 2, background: `var(--p-${def.pillar})` }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{def.label}</div>
          <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
            Kamp başlangıcından bugüne · {gunler.length} gün · {ozet}
          </div>
        </div>
        <button type="button" className="dugme" aria-label="Tam ekranı kapat" onClick={onKapat}>
          ✕
        </button>
      </header>

      <div className="flex-1 min-h-0 p-2 flex flex-col justify-center">
        <MetrikGrafigi
          def={def}
          seri={seri}
          tip={biriken || def.type === 'bool' ? 'bar' : 'cizgi'}
          yukseklik={Math.min(520, Math.max(260, window.innerHeight - 160))}
        />
      </div>

      <p
        className="text-xs text-center px-4 pb-4 shrink-0"
        style={{ color: 'var(--c-ink-3)' }}
      >
        Soldan sağa: kamp başlangıcı → bugün. Kapatmak için ✕ veya Esc.
      </p>
    </div>
  )
}
