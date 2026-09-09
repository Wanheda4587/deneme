import { useState } from 'react'
import { Alan, Kart } from '../components/ui/Kart.tsx'
import { Sayi } from '../components/ui/Girdiler.tsx'
import { DurumSatiri, MikroHedefListesi } from '../components/MikroHedefListesi.tsx'
import { METRIKLER, SUTUN_HARITASI, metrik } from '../lib/metrics.ts'
import type { MetrikId } from '../lib/metrics.ts'
import type { DayEntry, MikroHedef, MikroSonuc, MikroTur, MikroYon, OzelGirisTipi } from '../lib/types.ts'
import { yeniId } from '../lib/kimlik.ts'
import { bugun as bugunIso, gunEkle, kisaTarih, uzunTarih } from '../lib/date.ts'
import { mikroDurum, ozelGunBasarili, varsayilanTur } from '../lib/stats.ts'
import type { MikroDurum } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

const TUR_ETIKETI: Record<MikroTur, string> = {
  toplam: 'Dönem toplamı',
  ortalama: 'Dönem ortalaması',
  gun: 'Kaç gün yaptım',
}

const TUR_ACIKLAMA: Record<MikroTur, string> = {
  toplam: 'Dönem boyunca girdiklerin toplanır. Süreler için doğru seçim.',
  ortalama: 'Dönem boyunca girdiklerin ortalaması alınır. Puanlar için doğru seçim.',
  gun: 'O metriği sıfırdan büyük girdiğin gün sayısı sayılır.',
}

const HAZIR_SURELER = [7, 15, 30, 60]

export function MikroHedefler({ git }: { git?: (s: 'bugun') => void }) {
  const { gunler, ayarlar, ayarGuncelle } = useStore()
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null)
  const [silinecek, setSilinecek] = useState<string | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [gecmisAcik, setGecmisAcik] = useState(false)

  const bugun = bugunIso()
  const { mikroHedefler } = ayarlar

  const yaz = (id: string, yama: Partial<MikroHedef>) =>
    ayarGuncelle({ mikroHedefler: mikroHedefler.map((h) => (h.id === id ? { ...h, ...yama } : h)) })

  const sil = (id: string) => {
    ayarGuncelle({ mikroHedefler: mikroHedefler.filter((h) => h.id !== id) })
    setSilinecek(null)
    setDuzenlenen(null)
  }

  const ekle = (yeni: Omit<MikroHedef, 'id'>) => {
    const id = yeniId('mikro')
    ayarGuncelle({ mikroHedefler: [...mikroHedefler, { ...yeni, id }] })
    setEkleAcik(false)
    setDuzenlenen(id)
  }

  /**
   * Uzatma: biten hedef olduğu gibi geçmişte kalır, devamı olarak yeni bir
   * hedef açılır. Böylece hem seri devam eder hem geçmiş bozulmaz.
   */
  const uzat = (kaynak: MikroHedef, ekGun: number) => {
    const yeniBaslangic = gunEkle(kaynak.baslangic, kaynak.gunSayisi)
    const id = yeniId('mikro')
    ayarGuncelle({
      mikroHedefler: [
        ...mikroHedefler,
        { ...kaynak, id, baslangic: yeniBaslangic, gunSayisi: ekGun, sonuc: undefined, sonucNotu: undefined, oncekiId: kaynak.id },
      ],
    })
    setDuzenlenen(id)
  }

  const durumlar = mikroHedefler
    .map((h) => mikroDurum(h, gunler, bugun))
    .filter((d): d is MikroDurum => d !== null)

  const sonucBekleyenler = durumlar.filter((d) => d.asama === 'sonucBekliyor')

  // Bugüne denk gelen özel hedefler — işaretleme Bugün ekranında yapılıyor,
  // buradan bulunamıyordu; o yüzden yolu gösteren bir satır koyuyoruz.
  const bugunIsaretlenecek = durumlar
    .filter((d) => d.asama === 'devam' && d.hedef.kaynak === 'ozel')
    .map((d) => d.hedef)
    .filter((h) => h.baslangic <= bugun && bugun <= gunEkle(h.baslangic, h.gunSayisi - 1))

  const gecmis = durumlar
    .filter((d) => d.asama === 'kapandi')
    .sort((a, b) => b.bitis.localeCompare(a.bitis))

  const kullanilanMetrikler = new Set(
    mikroHedefler.filter((h) => h.kaynak === 'metrik' && !h.sonuc).map((h) => h.metrikId),
  )
  const eklenebilir = METRIKLER.filter((m) => !kullanilanMetrikler.has(m.id))

  return (
    <div className="flex flex-col gap-4">
      {/* Süresi dolanlar — sonuç bekliyor */}
      {sonucBekleyenler.length > 0 && (
        <Kart
          baslik="Süresi doldu — sonucu gir"
          ikon="⏳"
          sag={<span className="rozet rozet-uyari">{sonucBekleyenler.length}</span>}
        >
          {sonucBekleyenler.map((d) => (
            <SonucFormu
              key={d.hedef.id}
              durum={d}
              onSonuc={(sonuc, not) => yaz(d.hedef.id, { sonuc, sonucNotu: not })}
              onUzat={(gun) => uzat(d.hedef, gun)}
            />
          ))}
        </Kart>
      )}

      {/* Devam edenler */}
      <Kart baslik="Devam eden hedefler" ikon="🎯">
        <MikroHedefListesi bosMesaj="Devam eden hedef yok. Aşağıdan ekleyebilirsin." detayAcilabilir />
        {bugunIsaretlenecek.length > 0 && (
          <BugunHatirlatici
            hedefler={bugunIsaretlenecek}
            kayit={gunler.get(bugun)}
            git={git}
          />
        )}
      </Kart>

      {/* Yönetim */}
      <Kart baslik="Hedefleri düzenle" ikon="⚙️">
        {mikroHedefler.filter((h) => !h.sonuc).length === 0 && (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Henüz hedef yok. Aşağıdan ekle.
          </p>
        )}

        {mikroHedefler
          .filter((h) => !h.sonuc)
          .map((h) => {
            const ozel = h.kaynak === 'ozel'
            const def = ozel ? null : metrik(h.metrikId as MetrikId)
            if (!ozel && !def) return null
            const pillar = ozel ? 'disiplin' : def!.pillar
            const baslik = ozel ? (h.baslik ?? 'Hedef') : def!.label
            const acik = duzenlenen === h.id
            const bitis = gunEkle(h.baslangic, h.gunSayisi - 1)

            return (
              <div key={h.id} className="alan">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block shrink-0"
                    style={{ width: 8, height: 8, borderRadius: 2, background: `var(--p-${pillar})` }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{baslik}</span>
                    <span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
                      {h.yon === 'enAz' ? 'en az' : 'en fazla'}{' '}
                      {ozel ? `${h.hedef} gün` : hedefYazisi(h.tur, def!.type, def!.birim, h.hedef)}
                      {' · '}{h.gunSayisi} gün ({kisaTarih(h.baslangic)} – {kisaTarih(bitis)})
                    </span>
                  </span>
                  <label
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                    style={{ color: 'var(--c-ink-3)' }}
                  >
                    <input
                      type="checkbox"
                      checked={h.aktif}
                      onChange={(e) => yaz(h.id, { aktif: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: `var(--p-${pillar})` }}
                    />
                    aktif
                  </label>
                  <button
                    type="button"
                    className="dugme px-2 py-1 text-xs"
                    aria-label={`${baslik} hedefini düzenle`}
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
                    {ozel && (
                      <>
                        <Alan etiket="Hedefin">
                          <input
                            className="girdi"
                            value={h.baslik ?? ''}
                            onChange={(e) => yaz(h.id, { baslik: e.target.value })}
                            aria-label="Hedef başlığı"
                          />
                        </Alan>
                        <GirisTipiSecici
                          girisTipi={h.girisTipi ?? 'evetHayir'}
                          gunlukEsik={h.gunlukEsik}
                          ozelBirim={h.ozelBirim ?? 'dk'}
                          onTip={(t) =>
                            yaz(h.id, {
                              girisTipi: t,
                              gunlukEsik: t === 'evetHayir' ? undefined : (h.gunlukEsik ?? 70),
                              ozelBirim: t === 'sayi' ? (h.ozelBirim ?? 'dk') : undefined,
                            })
                          }
                          onEsik={(v) => yaz(h.id, { gunlukEsik: v })}
                          onBirim={(b) => yaz(h.id, { ozelBirim: b })}
                        />
                      </>
                    )}

                    {!ozel && (
                      <div>
                        <div className="etiket">Nasıl ölçülsün?</div>
                        <div className="flex flex-wrap gap-2">
                          {(def!.type === 'bool'
                            ? (['gun'] as MikroTur[])
                            : (['toplam', 'ortalama', 'gun'] as MikroTur[])
                          ).map((t) => (
                            <button
                              key={t}
                              type="button"
                              className="dugme text-sm"
                              aria-pressed={h.tur === t}
                              style={h.tur === t ? { borderColor: `var(--p-${pillar})`, color: 'var(--c-ink)' } : undefined}
                              onClick={() => yaz(h.id, { tur: t })}
                            >
                              {TUR_ETIKETI[t]}
                            </button>
                          ))}
                        </div>
                        <p className="ipucu">{TUR_ACIKLAMA[h.tur]}</p>
                      </div>
                    )}

                    <div>
                      <div className="etiket">Yön</div>
                      <div className="segment" style={{ ['--sutun-renk' as string]: `var(--p-${pillar})` }}>
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

                    <Alan etiket={ozel ? 'Kaç gün yapmalısın?' : 'Dönem hedefi'}>
                      <Sayi
                        deger={h.hedef}
                        onChange={(v) => yaz(h.id, { hedef: v ?? 0 })}
                        min={0}
                        max={ozel || h.tur === 'gun' ? h.gunSayisi : 10000}
                        adim={ozel || h.tur === 'gun' ? 1 : def!.type === 'scale' ? 0.5 : 5}
                        birim={ozel || h.tur === 'gun' ? 'gün' : def!.birim}
                        etiketi="Dönem hedefi"
                      />
                    </Alan>

                    <SureSecici
                      gunSayisi={h.gunSayisi}
                      baslangic={h.baslangic}
                      onGun={(g) => yaz(h.id, { gunSayisi: g })}
                      onBaslangic={(b) => yaz(h.id, { baslangic: b })}
                    />

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
            <YeniHedefFormu
              eklenebilir={eklenebilir}
              onEkle={ekle}
              onVazgec={() => setEkleAcik(false)}
            />
          ) : (
            <button type="button" className="dugme dugme-vurgu w-full" onClick={() => setEkleAcik(true)}>
              + Hedef ekle
            </button>
          )}
        </div>
      </Kart>

      {/* Geçmiş */}
      <Kart
        baslik="Geçmiş hedefler"
        ikon="📚"
        sag={
          <span className="flex items-center gap-2">
            <span className="rakam text-xs" style={{ color: 'var(--c-ink-3)' }}>
              {gecmis.length}
            </span>
            {gecmis.length > 0 && (
              <button
                type="button"
                className="dugme px-2 py-1 text-xs"
                aria-expanded={gecmisAcik}
                onClick={() => setGecmisAcik((o) => !o)}
              >
                {gecmisAcik ? 'gizle' : 'göster'}
              </button>
            )}
          </span>
        }
      >
        {gecmis.length === 0 ? (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Tamamlanmış hedef yok. Süresi dolan hedeflerin sonucunu girdikçe burada birikecek.
          </p>
        ) : gecmisAcik ? (
          <>
            {gecmis.map((d) => (
              <div key={d.hedef.id}>
                <DurumSatiri durum={d} detayAcilabilir />
                {d.hedef.sonucNotu && (
                  <p className="px-4 pb-3 text-xs" style={{ color: 'var(--c-ink-3)' }}>
                    “{d.hedef.sonucNotu}”
                  </p>
                )}
                <div className="px-4 pb-3">
                  <button
                    type="button"
                    className="dugme text-xs"
                    onClick={() => uzat(d.hedef, d.hedef.gunSayisi)}
                  >
                    ↻ Aynısını {d.hedef.gunSayisi} gün daha aç
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            {gecmis.filter((d) => d.hedef.sonuc === 'basarili').length} başarılı ·{' '}
            {gecmis.filter((d) => d.hedef.sonuc === 'basarisiz').length} başarısız
          </p>
        )}
      </Kart>
    </div>
  )
}

/** Hedef değerini birimiyle yazar; yüzde Türkçedeki gibi başa gelir. */
function hedefYazisi(tur: MikroTur, tip: string, birim: string | undefined, deger: number): string {
  if (tur === 'gun') return `${deger} gün`
  if (tip === 'percent') return `%${deger}`
  return birim ? `${deger} ${birim}` : String(deger)
}

/** Özel hedefte günlük girişin tipi ve başarı eşiği. */
function GirisTipiSecici({
  girisTipi,
  gunlukEsik,
  ozelBirim,
  onTip,
  onEsik,
  onBirim,
}: {
  girisTipi: OzelGirisTipi
  gunlukEsik: number | undefined
  ozelBirim: string
  onTip: (t: OzelGirisTipi) => void
  onEsik: (v: number | undefined) => void
  onBirim: (b: string) => void
}) {
  const secenekler: { id: OzelGirisTipi; ad: string; aciklama: string }[] = [
    { id: 'evetHayir', ad: 'Evet / Hayır', aciklama: '“Evet” dediğin gün başarılı sayılır.' },
    { id: 'puan', ad: 'Puan (%)', aciklama: 'Her gün yüzde verirsin; eşiği geçen gün başarılı sayılır.' },
    { id: 'sayi', ad: 'Sayı', aciklama: 'Her gün bir sayı girersin (dakika, sayfa…); eşiği geçen gün başarılı sayılır.' },
  ]
  const secili = secenekler.find((x) => x.id === girisTipi)!

  return (
    <div>
      <div className="etiket">Her gün ne gireceksin?</div>
      <div className="flex flex-wrap gap-2">
        {secenekler.map((x) => (
          <button
            key={x.id}
            type="button"
            className="dugme text-sm"
            aria-pressed={girisTipi === x.id}
            style={girisTipi === x.id ? { borderColor: 'var(--p-disiplin)', color: 'var(--c-ink)' } : undefined}
            onClick={() => onTip(x.id)}
          >
            {x.ad}
          </button>
        ))}
      </div>
      <p className="ipucu">{secili.aciklama}</p>

      {girisTipi !== 'evetHayir' && (
        <div className="flex flex-wrap gap-3 mt-2">
          <label className="flex-1 min-w-32">
            <span className="text-xs block mb-1" style={{ color: 'var(--c-ink-3)' }}>
              Günlük başarı eşiği
            </span>
            <Sayi
              deger={gunlukEsik}
              onChange={onEsik}
              min={0}
              max={girisTipi === 'puan' ? 100 : 100000}
              adim={girisTipi === 'puan' ? 5 : 1}
              birim={girisTipi === 'puan' ? '%' : ozelBirim}
              etiketi="Günlük başarı eşiği"
            />
          </label>
          {girisTipi === 'sayi' && (
            <label className="flex-1 min-w-24">
              <span className="text-xs block mb-1" style={{ color: 'var(--c-ink-3)' }}>Birim</span>
              <input
                className="girdi"
                value={ozelBirim}
                placeholder="dk"
                aria-label="Birim"
                onChange={(e) => onBirim(e.target.value)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

/** Süre ve başlangıç seçimi — hazır süreler artı serbest giriş. */
function SureSecici({
  gunSayisi,
  baslangic,
  onGun,
  onBaslangic,
}: {
  gunSayisi: number
  baslangic: string
  onGun: (g: number) => void
  onBaslangic: (b: string) => void
}) {
  return (
    <div>
      <div className="etiket">Süre</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {HAZIR_SURELER.map((g) => (
          <button
            key={g}
            type="button"
            className="dugme text-sm"
            aria-pressed={gunSayisi === g}
            style={gunSayisi === g ? { borderColor: 'var(--c-ink-3)', color: 'var(--c-ink)' } : undefined}
            onClick={() => onGun(g)}
          >
            {g} gün
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-32">
          <span className="text-xs block mb-1" style={{ color: 'var(--c-ink-3)' }}>Gün sayısı</span>
          <Sayi
            deger={gunSayisi}
            onChange={(v) => onGun(Math.max(v ?? 1, 1))}
            min={1}
            max={365}
            adim={1}
            birim="gün"
            etiketi="Gün sayısı"
          />
        </label>
        <label className="flex-1 min-w-40">
          <span className="text-xs block mb-1" style={{ color: 'var(--c-ink-3)' }}>Başlangıç</span>
          <input
            type="date"
            className="girdi"
            value={baslangic}
            aria-label="Başlangıç tarihi"
            onChange={(e) => e.target.value && onBaslangic(e.target.value)}
          />
        </label>
      </div>
      <p className="ipucu">
        Bitiş: {uzunTarih(gunEkle(baslangic, Math.max(gunSayisi, 1) - 1))}
      </p>
    </div>
  )
}

/**
 * "Veriyi nereye giriyorum?" sorusunun cevabı. Kendi hedeflerinin günlük
 * işaretlemesi Bugün ekranında yapılıyor; burada yalnızca durum görünüyor.
 */
function BugunHatirlatici({
  hedefler,
  kayit,
  git,
}: {
  hedefler: MikroHedef[]
  kayit: DayEntry | undefined
  git?: (s: 'bugun') => void
}) {
  const eksik = hedefler.filter((h) => ozelGunBasarili(h, kayit) === null)
  const tamam = eksik.length === 0

  return (
    <div className="alan flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>
        {tamam ? (
          <>
            <span aria-hidden="true">✓ </span>
            Bugünün işaretlemesi tamam.
          </>
        ) : (
          <>
            Bugün {eksik.length === hedefler.length ? '' : `${eksik.length} hedef `}işaretlenmedi.
            İşaretlemeyi <strong>Bugün</strong> ekranının en altındaki{' '}
            <strong>“Kendi hedeflerin”</strong> bölümünden yapıyorsun.
          </>
        )}
      </p>
      {git && (
        <button type="button" className="dugme dugme-ince" onClick={() => git('bugun')}>
          Bugün’e git →
        </button>
      )}
    </div>
  )
}

/** Süresi dolan hedef için sonuç girme ve uzatma. */
function SonucFormu({
  durum,
  onSonuc,
  onUzat,
}: {
  durum: MikroDurum
  onSonuc: (sonuc: MikroSonuc, not: string) => void
  onUzat: (gun: number) => void
}) {
  const [not, setNot] = useState('')
  return (
    <div className="alan">
      <DurumSatiri durum={durum} />
      <div className="mt-2 rounded-xl p-3" style={{ background: 'var(--c-card-2)' }}>
        <div className="etiket">Bu hedefte başarılı oldun mu?</div>
        <textarea
          className="girdi mb-2"
          rows={2}
          value={not}
          placeholder="Kısa bir not (isteğe bağlı)"
          aria-label="Sonuç notu"
          onChange={(e) => setNot(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="dugme flex-1"
            style={{ borderColor: 'color-mix(in oklab, var(--d-iyi) 50%, var(--c-cizgi))', color: 'var(--d-iyi)' }}
            onClick={() => onSonuc('basarili', not)}
          >
            ✓ Başardım
          </button>
          <button
            type="button"
            className="dugme flex-1"
            style={{ borderColor: 'color-mix(in oklab, var(--d-kotu) 50%, var(--c-cizgi))', color: 'var(--d-kotu)' }}
            onClick={() => onSonuc('basarisiz', not)}
          >
            ✕ Başaramadım
          </button>
          <button type="button" className="dugme" onClick={() => onUzat(durum.hedef.gunSayisi)}>
            ↻ {durum.hedef.gunSayisi} gün uzat
          </button>
        </div>
        <p className="ipucu">
          Uzatınca bu dönem geçmişe kaydedilir ve devamı yeni bir hedef olarak açılır.
        </p>
      </div>
    </div>
  )
}

/** Yeni hedef: metrikten seç ya da kendi hedefini yaz. */
function YeniHedefFormu({
  eklenebilir,
  onEkle,
  onVazgec,
}: {
  eklenebilir: typeof METRIKLER
  onEkle: (h: Omit<MikroHedef, 'id'>) => void
  onVazgec: () => void
}) {
  const [kaynak, setKaynak] = useState<'metrik' | 'ozel' | null>(null)
  const [baslik, setBaslik] = useState('')
  const [gunSayisi, setGunSayisi] = useState(15)
  const [baslangic, setBaslangic] = useState(bugunIso())
  const [girisTipi, setGirisTipi] = useState<OzelGirisTipi>('evetHayir')
  const [gunlukEsik, setGunlukEsik] = useState<number | undefined>(70)
  const [ozelBirim, setOzelBirim] = useState('dk')

  if (kaynak === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="etiket">Ne tür bir hedef?</div>
        <button type="button" className="dugme" onClick={() => setKaynak('metrik')}>
          📊 Takip ettiğim bir metriğe hedef koy
        </button>
        <button type="button" className="dugme" onClick={() => setKaynak('ozel')}>
          ✍️ Kendi hedefimi yazayım
        </button>
        <p className="ipucu">
          Kendi hedefini yazarsan gün gün “yaptım / yapmadım” diye işaretlersin.
        </p>
        <button type="button" className="dugme self-start" onClick={onVazgec}>Vazgeç</button>
      </div>
    )
  }

  if (kaynak === 'metrik') {
    return (
      <div className="flex flex-col gap-2">
        <div className="etiket">Hangi metriğe hedef koyalım?</div>
        <div className="flex flex-wrap gap-2">
          {eklenebilir.map((m) => (
            <button
              key={m.id}
              type="button"
              className="dugme text-sm"
              onClick={() =>
                onEkle({
                  kaynak: 'metrik',
                  metrikId: m.id,
                  hedef:
                    varsayilanTur(m.id) === 'gun'
                      ? Math.max(Math.round(gunSayisi * 0.6), 1)
                      : m.type === 'scale'
                        ? 7
                        : m.type === 'percent'
                          ? 75
                          : 150,
                  tur: varsayilanTur(m.id),
                  yon: 'enAz',
                  aktif: true,
                  baslangic,
                  gunSayisi,
                })
              }
            >
              <span aria-hidden="true">{SUTUN_HARITASI[m.pillar].ikon}</span> {m.label}
            </button>
          ))}
        </div>
        {eklenebilir.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Tüm metriklere hedef koyulmuş.
          </p>
        )}
        <SureSecici
          gunSayisi={gunSayisi}
          baslangic={baslangic}
          onGun={setGunSayisi}
          onBaslangic={setBaslangic}
        />
        <button type="button" className="dugme self-start" onClick={() => setKaynak(null)}>Geri</button>
      </div>
    )
  }

  const gecerli = baslik.trim().length > 0
  return (
    <div className="flex flex-col gap-3">
      <Alan etiket="Hedefin ne?">
        <input
          className="girdi"
          value={baslik}
          placeholder="Hedefini kendi cümlenle yaz"
          aria-label="Hedef başlığı"
          autoFocus
          onChange={(e) => setBaslik(e.target.value)}
        />
      </Alan>

      <GirisTipiSecici
        girisTipi={girisTipi}
        gunlukEsik={gunlukEsik}
        ozelBirim={ozelBirim}
        onTip={setGirisTipi}
        onEsik={setGunlukEsik}
        onBirim={setOzelBirim}
      />
      <SureSecici
        gunSayisi={gunSayisi}
        baslangic={baslangic}
        onGun={setGunSayisi}
        onBaslangic={setBaslangic}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="dugme dugme-vurgu flex-1"
          disabled={!gecerli}
          onClick={() =>
            onEkle({
              kaynak: 'ozel',
              baslik: baslik.trim(),
              girisTipi,
              gunlukEsik: girisTipi === 'evetHayir' ? undefined : (gunlukEsik ?? 0),
              ozelBirim: girisTipi === 'sayi' ? ozelBirim : undefined,
              hedef: gunSayisi,
              tur: 'gun',
              yon: 'enAz',
              aktif: true,
              baslangic,
              gunSayisi,
            })
          }
        >
          Ekle
        </button>
        <button type="button" className="dugme" onClick={() => setKaynak(null)}>Geri</button>
      </div>
      {!gecerli && <p className="ipucu">Hedefine bir ad ver.</p>}
    </div>
  )
}
