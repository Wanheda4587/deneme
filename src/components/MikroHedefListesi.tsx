import { useState } from 'react'
import { IlerlemeCubugu, sutunRengi } from './ui/Kart.tsx'
import { OzelHedefDetay } from './OzelHedefDetay.tsx'
import { bugun as bugunIso, kisaTarih } from '../lib/date.ts'
import { mikroBicim, mikroDurum } from '../lib/stats.ts'
import type { MikroDurum } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

export function DurumSatiri({
  durum,
  tarihGoster = true,
  detayAcilabilir = false,
}: {
  durum: MikroDurum
  tarihGoster?: boolean
  /** Özel hedeflerde satıra tıklayınca gün gün döküm açılsın mı. */
  detayAcilabilir?: boolean
}) {
  const { gunler } = useStore()
  const [detayAcik, setDetayAcik] = useState(false)
  const detayVar = detayAcilabilir && durum.hedef.kaynak === 'ozel'
  const { hedef, baslik, pillar, simdi, kalan, oran, tamam, kalanGun, gunlukGereken, bitis, asama } =
    durum
  const renk = sutunRengi(pillar)
  const enFazla = hedef.yon === 'enFazla'
  // "En fazla" hedefinde bütçe aşımı kötüdür; "en az" hedefinde hedefi aşmak iyidir.
  const asildi = enFazla && simdi > hedef.hedef

  const cubukRengi =
    hedef.sonuc === 'basarili'
      ? 'var(--d-iyi)'
      : hedef.sonuc === 'basarisiz'
        ? 'var(--d-kotu)'
        : asildi
          ? 'var(--d-kotu)'
          : tamam
            ? 'var(--d-iyi)'
            : renk

  const govde = (
    <>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block shrink-0"
            style={{ width: 8, height: 8, borderRadius: 2, background: renk }}
          />
          <span className="truncate">{baslik}</span>
          {hedef.kaynak === 'ozel' && (
            <span className="rozet shrink-0" style={{ fontSize: '0.6875rem' }}>kendi hedefin</span>
          )}
        </span>
        <span className="rakam text-sm font-semibold whitespace-nowrap">
          {mikroBicim(durum, simdi)}
          <span className="font-normal" style={{ color: 'var(--c-ink-3)' }}>
            {' / '}{mikroBicim(durum, hedef.hedef)}
          </span>
        </span>
      </div>

      <IlerlemeCubugu
        oran={Math.min(oran, 1)}
        renk={cubukRengi}
        etiket={`${baslik} hedefi`}
      />

      <div
        className="flex items-baseline justify-between gap-2 mt-1.5 text-xs"
        style={{ color: 'var(--c-ink-3)' }}
      >
        <span>
          {hedef.sonuc ? (
            <span style={{ color: hedef.sonuc === 'basarili' ? 'var(--d-iyi)' : 'var(--d-kotu)' }}>
              <span aria-hidden="true">{hedef.sonuc === 'basarili' ? '✓' : '✕'}</span>{' '}
              {hedef.sonuc === 'basarili' ? 'Başardın' : 'Başaramadın'}
            </span>
          ) : asildi ? (
            <span style={{ color: 'var(--d-kotu)' }}>
              <span aria-hidden="true">!</span> {mikroBicim(durum, simdi - hedef.hedef)} aşıldı
            </span>
          ) : tamam ? (
            <span style={{ color: 'var(--d-iyi)' }}>
              <span aria-hidden="true">✓</span> {enFazla ? 'sınır içinde' : 'tamamlandı'}
            </span>
          ) : (
            <span className="rakam">{mikroBicim(durum, kalan)} kaldı</span>
          )}
        </span>
        <span className="rakam">
          {asama === 'devam'
            ? `bitişe ${kalanGun} gün${
                gunlukGereken !== null ? ` · günde ${mikroBicim(durum, Math.ceil(gunlukGereken))}` : ''
              }`
            : tarihGoster
              ? `${kisaTarih(hedef.baslangic)} – ${kisaTarih(bitis)}`
              : 'süre doldu'}
        </span>
      </div>
    </>
  )

  if (!detayVar) return <div className="alan">{govde}</div>

  return (
    <div className="alan" style={{ paddingBottom: detayAcik ? 0 : undefined }}>
      <button
        type="button"
        className="w-full text-left"
        aria-expanded={detayAcik}
        aria-label={`${baslik} — gün gün dökümü`}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        onClick={() => setDetayAcik((o) => !o)}
      >
        {govde}
        <div className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
          {detayAcik ? '▲ dökümü gizle' : '▼ gün gün dökümü'}
        </div>
      </button>
      {detayAcik && (
        <div className="-mx-4">
          <OzelHedefDetay hedef={hedef} kayitlar={gunler} bugun={bugunIso()} />
        </div>
      )}
    </div>
  )
}

/**
 * Süresi devam eden mikro hedefleri ilerlemeleriyle listeler.
 * Biten ve sonucu girilmiş hedefler burada değil, geçmişte görünür.
 */
export function MikroHedefListesi({
  bosMesaj = 'Şu an devam eden hedef yok. Mikro Hedefler ekranından ekleyebilirsin.',
  enFazla,
  detayAcilabilir = false,
}: {
  bosMesaj?: string
  enFazla?: number
  detayAcilabilir?: boolean
}) {
  const { gunler, ayarlar } = useStore()
  const bugun = bugunIso()

  const durumlar = ayarlar.mikroHedefler
    .filter((h) => h.aktif && !h.sonuc)
    .map((h) => mikroDurum(h, gunler, bugun))
    .filter((d): d is MikroDurum => d !== null)
    // Süresi dolup sonuç bekleyenler üstte dursun
    .sort((a, b) => (a.asama === b.asama ? 0 : a.asama === 'sonucBekliyor' ? -1 : 1))

  if (durumlar.length === 0) {
    return (
      <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
        {bosMesaj}
      </p>
    )
  }

  const gosterilecek = enFazla ? durumlar.slice(0, enFazla) : durumlar

  return (
    <>
      {gosterilecek.map((d) => (
        <DurumSatiri key={d.hedef.id} durum={d} detayAcilabilir={detayAcilabilir} />
      ))}
      {enFazla && durumlar.length > enFazla && (
        <p className="alan text-xs" style={{ color: 'var(--c-ink-3)' }}>
          +{durumlar.length - enFazla} hedef daha
        </p>
      )}
    </>
  )
}
