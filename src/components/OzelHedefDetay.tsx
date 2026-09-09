import { sutunRengi } from './ui/Kart.tsx'
import { Sparkline } from './charts/Sparkline.tsx'
import type { MikroHedef } from '../lib/types.ts'
import type { DayEntry } from '../lib/types.ts'
import { kisaTarih, uzunTarih } from '../lib/date.ts'
import { ozelGunDokumu, ozelOzet } from '../lib/stats.ts'

/**
 * Özel hedefin gün gün dökümü: her gün için bir kare, altında başarı özeti.
 * Puan ve sayı hedeflerinde ayrıca değerlerin eğilim çizgisi çıkar.
 */
export function OzelHedefDetay({
  hedef,
  kayitlar,
  bugun,
}: {
  hedef: MikroHedef
  kayitlar: Map<string, DayEntry>
  bugun: string
}) {
  const dokum = ozelGunDokumu(hedef, kayitlar, bugun)
  const ozet = ozelOzet(dokum)
  const tip = hedef.girisTipi ?? 'evetHayir'
  const renk = sutunRengi('disiplin')

  const degerYazisi = (d: (typeof dokum)[number]) => {
    if (d.deger === undefined) return 'giriş yok'
    if (typeof d.deger === 'boolean') return d.deger ? 'Evet' : 'Hayır'
    return tip === 'puan' ? `%${d.deger}` : `${d.deger}${hedef.ozelBirim ? ` ${hedef.ozelBirim}` : ''}`
  }

  return (
    <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
      {/* Gün şeridi */}
      <div>
        <div className="flex flex-wrap gap-1">
          {dokum.map((d) => {
            const arka = d.gelecek
              ? 'transparent'
              : d.basarili === true
                ? 'var(--d-iyi)'
                : d.basarili === false
                  ? 'color-mix(in oklab, var(--d-kotu) 70%, var(--c-card-2))'
                  : 'var(--c-card-2)'
            return (
              <span
                key={d.tarih}
                title={`${uzunTarih(d.tarih)} — ${d.gelecek ? 'henüz gelmedi' : degerYazisi(d)}`}
                aria-label={`${kisaTarih(d.tarih)}: ${d.gelecek ? 'henüz gelmedi' : degerYazisi(d)}`}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: arka,
                  border: `1px solid ${d.gelecek ? 'var(--c-cizgi)' : 'transparent'}`,
                  opacity: d.gelecek ? 0.4 : 1,
                }}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--c-ink-3)' }}>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--d-iyi)' }} />
            başarılı
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: 'color-mix(in oklab, var(--d-kotu) 70%, var(--c-card-2))' }} />
            olmadı
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--c-card-2)' }} />
            giriş yok
          </span>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Başarı oranı</div>
          <div className="rakam font-semibold text-lg">
            {ozet.oran === null ? '—' : `%${Math.round(ozet.oran)}`}
          </div>
          <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
            {ozet.basariliGun}/{ozet.gecenGun} gün
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Güncel seri</div>
          <div className="rakam font-semibold text-lg">{ozet.guncelSeri} gün</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>En uzun seri</div>
          <div className="rakam font-semibold text-lg">{ozet.enUzunSeri} gün</div>
        </div>
      </div>

      {/* Sayısal hedeflerde değer eğilimi */}
      {tip !== 'evetHayir' && (
        <div>
          <div className="flex items-baseline justify-between text-xs mb-1" style={{ color: 'var(--c-ink-3)' }}>
            <span>Girdiğin değerler</span>
            <span className="rakam">
              eşik: {hedef.yon === 'enFazla' ? '≤' : '≥'} {hedef.gunlukEsik ?? 0}
              {tip === 'puan' ? '' : hedef.ozelBirim ? ` ${hedef.ozelBirim}` : ''}
            </span>
          </div>
          <Sparkline
            seri={dokum
              .filter((d) => !d.gelecek)
              .map((d) => ({ date: d.tarih, deger: typeof d.deger === 'number' ? d.deger : null }))}
            renk={renk}
            yukseklik={44}
            etiket={`${hedef.baslik ?? 'Hedef'} değer eğilimi`}
          />
        </div>
      )}
    </div>
  )
}
