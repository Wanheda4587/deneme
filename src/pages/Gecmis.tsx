import { useState } from 'react'
import { GunFormu, doluAlanSayisi } from '../components/GunFormu.tsx'
import { Kart } from '../components/ui/Kart.tsx'
import { SUTUNLAR, sutununMetrikleri } from '../lib/metrics.ts'
import {
  bugun as bugunIso,
  gunAdiKisa,
  gunFarki,
  haftaBasi,
  kampGunleri,
  kampGunu,
  kisaTarih,
  uzunTarih,
} from '../lib/date.ts'
import { seriHesapla } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

const HAFTA_BASLIKLARI = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function Gecmis() {
  const { gunler, ayarlar } = useStore()
  const [secili, setSecili] = useState<string | null>(null)

  const { kampBaslangic, kampGunSayisi } = ayarlar
  const gizli = new Set(ayarlar.gizliMetrikler)
  const toplamAlan = SUTUNLAR.flatMap((s) => sutununMetrikleri(s.id)).filter(
    (m) => !gizli.has(m.id),
  ).length

  const tumGunler = kampGunleri(kampBaslangic, kampGunSayisi)
  const bugunStr = bugunIso()
  const gecmisGunler = tumGunler.filter((g) => gunFarki(g, bugunStr) >= 0)

  const girisSerisi = seriHesapla(gecmisGunler, gunler, (g) => doluAlanSayisi(g, gizli) > 0)
  const antrenmanSerisi = seriHesapla(gecmisGunler, gunler, (g) => g?.antrenman === true)
  const doluGun = gecmisGunler.filter((g) => doluAlanSayisi(gunler.get(g), gizli) > 0).length

  // Takvimi hafta satırlarına böl; ilk haftanın başındaki boş günler için dolgu
  const ilkHafta = haftaBasi(tumGunler[0])
  const bosBaslangic = gunFarki(ilkHafta, tumGunler[0])
  const hucreler: (string | null)[] = [...Array(bosBaslangic).fill(null), ...tumGunler]
  const satirlar: (string | null)[][] = []
  for (let i = 0; i < hucreler.length; i += 7) satirlar.push(hucreler.slice(i, i + 7))

  // Tek hue'lu sıralı ölçek: doluluk arttıkça renk güçlenir (gökkuşağı değil).
  const KADEME = [18, 36, 56, 74, 92]
  const kademeYuzdesi = (oran: number) =>
    KADEME[Math.min(Math.floor(oran * KADEME.length), KADEME.length - 1)]

  const yogunluk = (date: string) => {
    const n = doluAlanSayisi(gunler.get(date), gizli)
    if (n === 0) {
      return { arka: 'var(--c-card-2)', kenar: 'var(--c-cizgi)', koyu: false, adet: 0 }
    }
    const oran = Math.min(n / Math.max(toplamAlan, 1), 1)
    const yuzde = kademeYuzdesi(oran)
    return {
      arka: `color-mix(in oklab, var(--p-vucut) ${yuzde}%, var(--c-card-2))`,
      kenar: 'transparent',
      koyu: yuzde >= 50,
      adet: n,
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Kart baslik="Kampın haritası" ikon="🗓️">
        <div className="alan grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Giriş yapılan gün</div>
            <div className="rakam font-semibold text-lg">{doluGun}/{gecmisGunler.length}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Giriş serisi</div>
            <div className="rakam font-semibold text-lg">{girisSerisi.guncel} gün</div>
            <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
              en uzun {girisSerisi.enUzun}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Antrenman serisi</div>
            <div className="rakam font-semibold text-lg">{antrenmanSerisi.guncel} gün</div>
            <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
              en uzun {antrenmanSerisi.enUzun}
            </div>
          </div>
        </div>

        <div className="alan">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {HAFTA_BASLIKLARI.map((g) => (
              <div key={g} className="text-center text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {g}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {satirlar.map((satir, i) => (
              <div key={i} className="grid grid-cols-7 gap-1">
                {satir.map((date, j) => {
                  if (!date) return <div key={`bos-${j}`} />
                  const gelecek = gunFarki(bugunStr, date) > 0
                  const { arka, kenar, koyu, adet: n } = yogunluk(date)
                  const gunNo = kampGunu(date, kampBaslangic, kampGunSayisi)
                  return (
                    <button
                      key={date}
                      type="button"
                      className="rounded-md text-xs rakam"
                      aria-label={`${uzunTarih(date)} — ${n} alan dolduruldu`}
                      aria-pressed={secili === date}
                      disabled={gelecek}
                      onClick={() => setSecili(secili === date ? null : date)}
                      style={{
                        aspectRatio: '1',
                        background: gelecek ? 'transparent' : arka,
                        border: `1px solid ${gelecek ? 'var(--c-cizgi)' : kenar}`,
                        color: gelecek
                          ? 'var(--c-ink-3)'
                          : koyu ? '#fff' : 'var(--c-ink-2)',
                        opacity: gelecek ? 0.35 : 1,
                        outline: secili === date ? '2px solid var(--c-ink)' : undefined,
                        outlineOffset: 1,
                      }}
                    >
                      {gunNo ?? ''}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1.5 text-xs" style={{ color: 'var(--c-ink-3)' }}>
            <div className="flex items-center gap-1.5">
              <span>boş</span>
              <span
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: 'var(--c-card-2)', border: '1px solid var(--c-cizgi)',
                }}
              />
              {KADEME.map((y) => (
                <span
                  key={y}
                  aria-hidden="true"
                  style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: `color-mix(in oklab, var(--p-vucut) ${y}%, var(--c-card-2))`,
                  }}
                />
              ))}
              <span>dolu</span>
            </div>
            <div>Renk = o gün kaç alan dolduruldu · rakam = kampın kaçıncı günü</div>
          </div>
        </div>
      </Kart>

      {secili && (
        <>
          <div className="kart p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{uzunTarih(secili)}</div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {gunAdiKisa(secili)} · {kisaTarih(secili)} · düzenliyorsun
              </div>
            </div>
            <button type="button" className="dugme" onClick={() => setSecili(null)}>
              Kapat
            </button>
          </div>
          <GunFormu date={secili} />
        </>
      )}

      {!secili && (
        <p className="text-sm text-center px-4" style={{ color: 'var(--c-ink-3)' }}>
          Düzenlemek istediğin güne dokun.
        </p>
      )}
    </div>
  )
}
