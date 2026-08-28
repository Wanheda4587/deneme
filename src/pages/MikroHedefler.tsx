import { useState } from 'react'
import { Alan, Kart } from '../components/ui/Kart.tsx'
import { Sayi } from '../components/ui/Girdiler.tsx'
import { MikroHedefListesi } from '../components/MikroHedefListesi.tsx'
import { METRIKLER, SUTUN_HARITASI, metrik } from '../lib/metrics.ts'
import type { MetrikId } from '../lib/metrics.ts'
import type { MikroHedef, MikroTur, MikroYon } from '../lib/types.ts'
import { yeniId } from '../lib/kimlik.ts'
import { bugun as bugunIso, gunEkle, haftaBasi, kampHaftasi, kisaTarih } from '../lib/date.ts'
import { varsayilanTur } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

const TUR_ETIKETI: Record<MikroTur, string> = {
  toplam: 'Haftalık toplam',
  ortalama: 'Haftalık ortalama',
  gun: 'Kaç gün yaptım',
}

const TUR_ACIKLAMA: Record<MikroTur, string> = {
  toplam: 'Hafta boyunca girdiklerin toplanır. Süreler için doğru seçim.',
  ortalama: 'Hafta boyunca girdiklerin ortalaması alınır. Puanlar için doğru seçim.',
  gun: 'O metriği sıfırdan büyük girdiğin gün sayısı sayılır.',
}

export function MikroHedefler() {
  const { ayarlar, ayarGuncelle } = useStore()
  const [hafta, setHafta] = useState(() => haftaBasi(bugunIso()))
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null)
  const [silinecek, setSilinecek] = useState<string | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)

  const { mikroHedefler, kampBaslangic, kampGunSayisi } = ayarlar
  const haftaNo = kampHaftasi(hafta, kampBaslangic, kampGunSayisi)

  const yaz = (id: string, yama: Partial<MikroHedef>) =>
    ayarGuncelle({ mikroHedefler: mikroHedefler.map((h) => (h.id === id ? { ...h, ...yama } : h)) })

  const sil = (id: string) => {
    ayarGuncelle({ mikroHedefler: mikroHedefler.filter((h) => h.id !== id) })
    setSilinecek(null)
    setDuzenlenen(null)
  }

  const ekle = (metrikId: MetrikId) => {
    const def = metrik(metrikId)
    const tur = varsayilanTur(metrikId)
    const id = yeniId('mikro')
    // Makul bir başlangıç hedefi: ölçek metriklerinde 7, yüzdede 75, sürede 150.
    const varsayilanHedef =
      tur === 'gun' ? 4 : def.type === 'scale' ? 7 : def.type === 'percent' ? 75 : 150
    ayarGuncelle({
      mikroHedefler: [
        ...mikroHedefler,
        { id, metrikId, hedef: varsayilanHedef, tur, yon: 'enAz', aktif: true },
      ],
    })
    setEkleAcik(false)
    setDuzenlenen(id)
  }

  const kullanilan = new Set(mikroHedefler.map((h) => h.metrikId))
  const eklenebilir = METRIKLER.filter((m) => !kullanilan.has(m.id) && m.type !== 'bool')

  return (
    <div className="flex flex-col gap-4">
      {/* Hafta gezinme */}
      <div className="kart p-3 flex items-center gap-2">
        <button type="button" className="dugme" aria-label="Önceki hafta" onClick={() => setHafta(gunEkle(hafta, -7))}>‹</button>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-semibold">
            {haftaNo !== null ? `${haftaNo}. hafta` : 'Kamp dışı hafta'}
          </div>
          <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
            {kisaTarih(hafta)} – {kisaTarih(gunEkle(hafta, 6))}
          </div>
        </div>
        <button type="button" className="dugme" aria-label="Sonraki hafta" onClick={() => setHafta(gunEkle(hafta, 7))}>›</button>
      </div>

      <Kart baslik="Bu haftaki durum" ikon="🎯">
        <MikroHedefListesi haftaBasiIso={hafta} />
      </Kart>

      {/* Hedef yönetimi */}
      <Kart baslik="Hedefleri düzenle" ikon="⚙️">
        {mikroHedefler.length === 0 && (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Henüz haftalık hedef yok. Aşağıdan ekle — örneğin "haftada 300 dk kitap oku".
          </p>
        )}

        {mikroHedefler.map((h) => {
          const def = metrik(h.metrikId as MetrikId)
          if (!def) return null
          const sutun = SUTUN_HARITASI[def.pillar]
          const acik = duzenlenen === h.id
          return (
            <div key={h.id} className="alan">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block shrink-0"
                  style={{ width: 8, height: 8, borderRadius: 2, background: `var(--p-${def.pillar})` }}
                />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">{def.label}</span>
                  <span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
                    {h.yon === 'enAz' ? 'en az' : 'en fazla'} {h.hedef}
                    {h.tur === 'gun' ? ' gün' : def.birim ? ` ${def.birim}` : ''} · {TUR_ETIKETI[h.tur].toLowerCase()}
                  </span>
                </span>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--c-ink-3)' }}>
                  <input
                    type="checkbox"
                    checked={h.aktif}
                    onChange={(e) => yaz(h.id, { aktif: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: `var(--p-${sutun.id})` }}
                  />
                  aktif
                </label>
                <button
                  type="button"
                  className="dugme px-2 py-1 text-xs"
                  aria-label={`${def.label} hedefini düzenle`}
                  aria-pressed={acik}
                  onClick={() => setDuzenlenen(acik ? null : h.id)}
                >
                  ✏️
                </button>
              </div>

              {acik && (
                <div
                  className="mt-3 rounded-xl p-3 flex flex-col gap-3"
                  style={{ background: 'var(--c-card-2)', border: '1px solid var(--c-cizgi)' }}
                >
                  <div>
                    <div className="etiket">Nasıl ölçülsün?</div>
                    <div className="flex flex-wrap gap-2">
                      {(['toplam', 'ortalama', 'gun'] as MikroTur[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="dugme text-sm"
                          aria-pressed={h.tur === t}
                          style={h.tur === t ? { borderColor: `var(--p-${def.pillar})`, color: 'var(--c-ink)' } : undefined}
                          onClick={() => yaz(h.id, { tur: t })}
                        >
                          {TUR_ETIKETI[t]}
                        </button>
                      ))}
                    </div>
                    <p className="ipucu">{TUR_ACIKLAMA[h.tur]}</p>
                  </div>

                  <div>
                    <div className="etiket">Yön</div>
                    <div className="segment" style={{ ['--sutun-renk' as string]: `var(--p-${def.pillar})` }}>
                      {(['enAz', 'enFazla'] as MikroYon[]).map((y) => (
                        <button
                          key={y}
                          type="button"
                          className="segment-dugme"
                          aria-pressed={h.yon === y}
                          onClick={() => yaz(h.id, { yon: y })}
                        >
                          {y === 'enAz' ? 'En az bu kadar' : 'En fazla bu kadar'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Alan etiket="Haftalık hedef">
                    <Sayi
                      deger={h.hedef}
                      onChange={(v) => yaz(h.id, { hedef: v ?? 0 })}
                      min={0}
                      max={h.tur === 'gun' ? 7 : 10000}
                      adim={h.tur === 'gun' ? 1 : def.type === 'scale' ? 0.5 : 5}
                      birim={h.tur === 'gun' ? 'gün' : def.birim}
                      etiketi="Haftalık hedef"
                    />
                  </Alan>

                  <div className="flex flex-wrap gap-2">
                    {silinecek === h.id ? (
                      <>
                        <span className="text-sm self-center">Bu hedef silinsin mi?</span>
                        <button type="button" className="dugme dugme-tehlike" onClick={() => sil(h.id)}>Evet, sil</button>
                        <button type="button" className="dugme" onClick={() => setSilinecek(null)}>Vazgeç</button>
                      </>
                    ) : (
                      <button type="button" className="dugme dugme-tehlike" onClick={() => setSilinecek(h.id)}>
                        🗑 Sil
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="alan">
          {ekleAcik ? (
            <div className="flex flex-col gap-2">
              <div className="etiket">Hangi metriğe hedef koyalım?</div>
              <div className="flex flex-wrap gap-2">
                {eklenebilir.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="dugme text-sm"
                    onClick={() => ekle(m.id)}
                  >
                    <span aria-hidden="true">{SUTUN_HARITASI[m.pillar].ikon}</span> {m.label}
                  </button>
                ))}
              </div>
              {eklenebilir.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>
                  Tüm uygun metriklere hedef koyulmuş.
                </p>
              )}
              <button type="button" className="dugme self-start" onClick={() => setEkleAcik(false)}>
                Vazgeç
              </button>
            </div>
          ) : (
            <button type="button" className="dugme dugme-vurgu w-full" onClick={() => setEkleAcik(true)}>
              + Haftalık hedef ekle
            </button>
          )}
        </div>
      </Kart>
    </div>
  )
}
