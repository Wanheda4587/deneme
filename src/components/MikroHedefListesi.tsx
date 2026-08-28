import { IlerlemeCubugu, sutunRengi } from './ui/Kart.tsx'
import { bugun as bugunIso } from '../lib/date.ts'
import { mikroBicim, mikroDurum } from '../lib/stats.ts'
import type { MikroDurum } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

function DurumSatiri({ durum }: { durum: MikroDurum }) {
  const { def, hedef, simdi, kalan, oran, tamam, kalanGun, gunlukGereken } = durum
  const renk = sutunRengi(def.pillar)
  const enFazla = hedef.yon === 'enFazla'
  // "En fazla" hedefinde bütçe aşımı kötüdür; "en az" hedefinde hedefi aşmak iyidir.
  const asildi = enFazla && simdi > hedef.hedef

  return (
    <div className="alan">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block shrink-0"
            style={{ width: 8, height: 8, borderRadius: 2, background: renk }}
          />
          <span className="truncate">{def.label}</span>
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
        renk={asildi ? 'var(--d-kotu)' : tamam ? 'var(--d-iyi)' : renk}
        etiket={`${def.label} haftalık hedefi`}
      />

      <div className="flex items-baseline justify-between gap-2 mt-1.5 text-xs" style={{ color: 'var(--c-ink-3)' }}>
        <span>
          {asildi ? (
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
          {kalanGun > 0 ? `${kalanGun} gün kaldı` : 'hafta bitti'}
          {gunlukGereken !== null && kalanGun > 0
            ? ` · günde ${mikroBicim(durum, Math.ceil(gunlukGereken))}`
            : ''}
        </span>
      </div>
    </div>
  )
}

/** Verilen haftanın aktif mikro hedeflerini ilerlemeleriyle listeler. */
export function MikroHedefListesi({
  haftaBasiIso,
  bosMesaj = 'Bu hafta için hedef tanımlanmamış. Mikro Hedefler ekranından ekleyebilirsin.',
  enFazla,
}: {
  haftaBasiIso: string
  bosMesaj?: string
  enFazla?: number
}) {
  const { gunler, ayarlar } = useStore()
  const bugun = bugunIso()

  const durumlar = ayarlar.mikroHedefler
    .filter((h) => h.aktif)
    .map((h) => mikroDurum(h, haftaBasiIso, gunler, bugun))
    .filter((d): d is MikroDurum => d !== null)

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
        <DurumSatiri key={d.hedef.id} durum={d} />
      ))}
      {enFazla && durumlar.length > enFazla && (
        <p className="alan text-xs" style={{ color: 'var(--c-ink-3)' }}>
          +{durumlar.length - enFazla} hedef daha
        </p>
      )}
    </>
  )
}
