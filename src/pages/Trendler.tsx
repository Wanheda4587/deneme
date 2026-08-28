import { useState } from 'react'
import { Kart } from '../components/ui/Kart.tsx'
import { MetrikGrafigi } from '../components/charts/MetrikGrafigi.tsx'
import { METRIKLER, SUTUNLAR } from '../lib/metrics.ts'
import type { Pillar } from '../lib/types.ts'
import { bugun as bugunIso, gunEkle, gunFarki, kampGunleri } from '../lib/date.ts'
import { birikenMi, degisimYonu, metrikSerisi, ortalama, toplam } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

type Aralik = 14 | 30 | 0 // 0 = tüm kamp

export function Trendler() {
  const { gunler, ayarlar } = useStore()
  const [aralik, setAralik] = useState<Aralik>(30)
  const [sutunFiltre, setSutunFiltre] = useState<Pillar | 'hepsi'>('hepsi')

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
                return o === null ? '—' : `ort. ${o.toFixed(1)}${def.birim ? ` ${def.birim}` : ''}`
              })()

        return (
          <Kart
            key={def.id}
            baslik={def.label}
            ikon={SUTUNLAR.find((s) => s.id === def.pillar)?.ikon}
            pillar={def.pillar}
            sag={<span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>{ozet}</span>}
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
    </div>
  )
}
