import { useState } from 'react'
import { GunFormu, doluAlanSayisi } from '../components/GunFormu.tsx'
import { IlerlemeCubugu } from '../components/ui/Kart.tsx'
import { SUTUNLAR, sutununMetrikleri } from '../lib/metrics.ts'
import {
  bugun as bugunIso,
  gunEkle,
  gunFarki,
  kampGunu,
  uzunTarih,
} from '../lib/date.ts'
import { useStore } from '../state/store.tsx'

export function Bugun() {
  const { gunler, ayarlar } = useStore()
  const [date, setDate] = useState(bugunIso())

  const { kampBaslangic, kampGunSayisi } = ayarlar
  const gunNo = kampGunu(date, kampBaslangic, kampGunSayisi)
  const gizli = new Set(ayarlar.gizliMetrikler)
  const toplamAlan = SUTUNLAR.flatMap((s) => sutununMetrikleri(s.id)).filter(
    (m) => !gizli.has(m.id),
  ).length
  const dolu = doluAlanSayisi(gunler.get(date), gizli)

  const bugunMu = date === bugunIso()
  const gelecekMi = gunFarki(bugunIso(), date) > 0
  const kampBitis = gunEkle(kampBaslangic, kampGunSayisi - 1)
  const baslangicaKalan = gunFarki(bugunIso(), kampBaslangic)

  return (
    <div className="flex flex-col gap-4">
      {/* Tarih gezinme */}
      <div className="kart p-3 flex items-center gap-2">
        <button
          type="button"
          className="dugme"
          aria-label="Önceki gün"
          onClick={() => setDate(gunEkle(date, -1))}
        >
          ‹
        </button>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-semibold truncate">{uzunTarih(date)}</div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
            {gunNo !== null
              ? `Kampın ${gunNo}. günü`
              : baslangicaKalan > 0
                ? 'Kamp henüz başlamadı'
                : 'Kamp dışı gün'}
            {!bugunMu && ' · bugün değil'}
          </div>
        </div>
        <button
          type="button"
          className="dugme"
          aria-label="Sonraki gün"
          disabled={gelecekMi}
          onClick={() => setDate(gunEkle(date, 1))}
        >
          ›
        </button>
      </div>

      {!bugunMu && (
        <button type="button" className="dugme dugme-vurgu" onClick={() => setDate(bugunIso())}>
          Bugüne dön
        </button>
      )}

      {/* Kamp ilerlemesi */}
      {gunNo !== null && (
        <div className="kart p-4 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">
              Gün <span className="rakam">{gunNo}</span> / {kampGunSayisi}
            </span>
            <span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
              {kampGunSayisi - gunNo} gün kaldı
            </span>
          </div>
          <IlerlemeCubugu
            oran={gunNo / kampGunSayisi}
            renk="var(--p-vucut)"
            etiket={`Kamp ilerlemesi: ${kampGunSayisi} günün ${gunNo}. günü`}
          />
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
            Bu gün için <span className="rakam">{dolu}</span> / {toplamAlan} alan dolduruldu
          </div>
        </div>
      )}

      {/* Kamp henüz başlamadıysa geri sayım, bittiyse tamamlandı bilgisi */}
      {gunNo === null && (
        <div className="kart p-4 flex flex-col gap-1">
          {baslangicaKalan > 0 ? (
            <>
              <div className="text-sm font-semibold">
                Kamp <span className="rakam">{baslangicaKalan}</span> gün sonra başlıyor
              </div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                Başlangıç: {uzunTarih(kampBaslangic)} · Bitiş: {uzunTarih(kampBitis)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
                Şimdiden veri girebilirsin — kaydedilir, sadece kamp istatistiklerine sayılmaz.
                Tarihi Ayarlar'dan değiştirebilirsin.
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">Bu gün kampın dışında</div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                Kamp {uzunTarih(kampBaslangic)} — {uzunTarih(kampBitis)} arasıydı.
              </div>
            </>
          )}
        </div>
      )}

      {gelecekMi && (
        <p className="text-sm px-1" style={{ color: 'var(--c-ink-3)' }}>
          Gelecek bir gün seçili — veri girebilirsin ama trendlere bugünden sonra yansır.
        </p>
      )}

      <GunFormu date={date} />

      <p className="text-xs text-center px-4 pb-2" style={{ color: 'var(--c-ink-3)' }}>
        Değişiklikler otomatik kaydedilir. Hiçbir alan zorunlu değil.
      </p>
    </div>
  )
}
