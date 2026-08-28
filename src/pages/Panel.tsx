import { IlerlemeCubugu, Kart, sutunRengi } from '../components/ui/Kart.tsx'
import { Sparkline } from '../components/charts/Sparkline.tsx'
import { MikroHedefListesi } from '../components/MikroHedefListesi.tsx'
import { doluAlanSayisi } from '../components/GunFormu.tsx'
import { METRIKLER, SUTUNLAR, sutununMetrikleri } from '../lib/metrics.ts'
import type { MetrikId } from '../lib/metrics.ts'
import {
  bugun as bugunIso,
  gunEkle,
  gunFarki,
  haftaBasi,
  kampGunleri,
  kampGunu,
  uzunTarih,
} from '../lib/date.ts'
import {
  birikenMi,
  degisimYonu,
  haftaDegeri,
  haftaOzeti,
  hedefDurumu,
  metrikDegeri,
  metrikSerisi,
  seriHesapla,
  yuzdeDegisim,
} from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

/** Panelde eğilim çizgisi gösterilecek metrikler — her sütundan en önemlisi. */
const ONE_CIKANLAR: MetrikId[] = ['enerji', 'disiplin', 'uykuSaati', 'mutluluk', 'kitapDk', 'gelirDk']

export function Panel({ git }: { git: (sekme: string) => void }) {
  const { gunler, haftalar, ayarlar } = useStore()
  const { kampBaslangic, kampGunSayisi, olcumHedefleri } = ayarlar

  const bugun = bugunIso()
  const gizli = new Set(ayarlar.gizliMetrikler)
  const gunNo = kampGunu(bugun, kampBaslangic, kampGunSayisi)
  const gecenGun = Math.min(Math.max(gunFarki(kampBaslangic, bugun) + 1, 0), kampGunSayisi)
  const baslangicaKalan = gunFarki(bugun, kampBaslangic)

  const toplamAlan = SUTUNLAR.flatMap((s) => sutununMetrikleri(s.id)).filter(
    (m) => !gizli.has(m.id),
  ).length
  const bugunDolu = doluAlanSayisi(gunler.get(bugun), gizli)

  const buHafta = haftaBasi(bugun)
  const gecenHafta = gunEkle(buHafta, -7)

  // Son 14 gün penceresi — sparkline'lar için
  const pencere = Array.from({ length: 14 }, (_, i) => gunEkle(bugun, -(13 - i)))

  // Seriler
  const gecmisGunler = kampGunleri(kampBaslangic, kampGunSayisi).filter(
    (g) => gunFarki(g, bugun) >= 0,
  )
  const girisSerisi = seriHesapla(gecmisGunler, gunler, (g) => doluAlanSayisi(g, gizli) > 0)
  const antrenmanSerisi = seriHesapla(gecmisGunler, gunler, (g) => g?.antrenman === true)

  // Bu hafta ↔ geçen hafta: en çok değişen metrikler
  const degisimler = METRIKLER.filter((m) => !gizli.has(m.id))
    .map((def) => {
      const bu = haftaDegeri(haftaOzeti(buHafta, gunler, def.id), def.id)
      const gecen = haftaDegeri(haftaOzeti(gecenHafta, gunler, def.id), def.id)
      const yuzde = yuzdeDegisim(gecen, bu)
      const fark = bu !== null && gecen !== null ? bu - gecen : null
      return { def, bu, gecen, yuzde, fark, yon: degisimYonu(def, fark) }
    })
    .filter((d) => d.yuzde !== null && d.yon !== 'notr')
    .sort((a, b) => Math.abs(b.yuzde!) - Math.abs(a.yuzde!))

  const yukselen = degisimler.filter((d) => d.yon === 'iyi').slice(0, 3)
  const dusen = degisimler.filter((d) => d.yon === 'kotu').slice(0, 3)

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
      {/* Kamp ilerlemesi */}
      <div className="kart p-4 flex flex-col gap-2 md:col-span-2">
        {gunNo !== null ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">
                Gün <span className="rakam">{gunNo}</span> / {kampGunSayisi}
              </span>
              <span className="text-sm rakam" style={{ color: 'var(--c-ink-3)' }}>
                {kampGunSayisi - gunNo} gün kaldı
              </span>
            </div>
            <IlerlemeCubugu
              oran={gunNo / kampGunSayisi}
              renk={sutunRengi('vucut')}
              etiket={`Kamp ilerlemesi: ${kampGunSayisi} günün ${gunNo}. günü`}
            />
          </>
        ) : baslangicaKalan > 0 ? (
          <>
            <span className="font-semibold">
              Kamp <span className="rakam">{baslangicaKalan}</span> gün sonra başlıyor
            </span>
            <span className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
              Başlangıç: {uzunTarih(kampBaslangic)}
            </span>
          </>
        ) : (
          <span className="font-semibold">Kamp tamamlandı</span>
        )}
        <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
          Bugün: {uzunTarih(bugun)}
        </div>
      </div>

      {/* Bugün */}
      <Kart
        baslik="Bugün"
        ikon="📋"
        sag={
          <span className="rakam text-xs" style={{ color: 'var(--c-ink-3)' }}>
            {bugunDolu}/{toplamAlan} alan
          </span>
        }
      >
        <div className="alan">
          <IlerlemeCubugu
            oran={toplamAlan === 0 ? 0 : bugunDolu / toplamAlan}
            renk={bugunDolu === 0 ? 'var(--c-ink-3)' : sutunRengi('disiplin')}
            etiket="Bugünün doluluk oranı"
          />
          <div className="grid grid-cols-3 gap-3 mt-3">
            {(['enerji', 'mutluluk', 'disiplin'] as MetrikId[]).map((id) => {
              const def = METRIKLER.find((m) => m.id === id)!
              const v = metrikDegeri(gunler.get(bugun), id)
              return (
                <div key={id}>
                  <div className="text-xs truncate" style={{ color: 'var(--c-ink-3)' }}>{def.kisa}</div>
                  <div className="rakam font-semibold text-lg">
                    {v === null ? '—' : def.type === 'percent' ? `%${v}` : v}
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" className="dugme dugme-vurgu w-full mt-3" onClick={() => git('bugun')}>
            {bugunDolu === 0 ? 'Bugünü doldurmaya başla' : 'Bugünü düzenle'}
          </button>
        </div>
      </Kart>

      {/* Bu haftanın hedefleri */}
      <Kart
        baslik="Bu haftanın hedefleri"
        ikon="🎯"
        sag={
          <button type="button" className="dugme px-2 py-1 text-xs" onClick={() => git('mikro')}>
            düzenle
          </button>
        }
      >
        <MikroHedefListesi
          haftaBasiIso={buHafta}
          enFazla={4}
          bosMesaj="Bu hafta için hedef yok. Örneğin “haftada 300 dk kitap” koyabilirsin."
        />
      </Kart>

      {/* Ölçüm hedefleri */}
      {olcumHedefleri.length > 0 && (
        <Kart
          baslik="Ölçüm hedefleri"
          ikon="📏"
          pillar="vucut"
          sag={
            <button type="button" className="dugme px-2 py-1 text-xs" onClick={() => git('hedefler')}>
              düzenle
            </button>
          }
        >
          {olcumHedefleri.map((h) => {
            const sonDeger =
              [...haftalar.values()]
                .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
                .map((w) => w.olcumler?.[h.id])
                .find((v) => typeof v === 'number') ?? null
            const durum =
              h.hedef === null
                ? null
                : hedefDurumu(h.baslangic, h.hedef, sonDeger, gecenGun, kampGunSayisi)
            return (
              <div key={h.id} className="alan">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium">{h.label}</span>
                  <span className="rakam text-sm font-semibold">
                    {sonDeger === null ? '—' : `${sonDeger} ${h.birim}`}
                    {h.hedef !== null && (
                      <span className="font-normal" style={{ color: 'var(--c-ink-3)' }}>
                        {' / '}{h.hedef} {h.birim}
                      </span>
                    )}
                  </span>
                </div>
                {durum ? (
                  <>
                    <IlerlemeCubugu
                      oran={(durum.ilerleme ?? 0) / 100}
                      renk={sutunRengi('vucut')}
                      etiket={`${h.label} hedefine ilerleme`}
                    />
                    <div className="text-xs mt-1.5 flex justify-between" style={{ color: 'var(--c-ink-3)' }}>
                      <span className="rakam">
                        {sonDeger === null
                          ? 'ölçüm bekleniyor'
                          : `hedefe ${Math.abs(h.hedef! - sonDeger).toFixed(1)} ${h.birim} kaldı`}
                      </span>
                      {durum.onde !== null && (
                        <span style={{ color: durum.onde ? 'var(--d-iyi)' : 'var(--d-uyari)' }}>
                          <span aria-hidden="true">{durum.onde ? '✓' : '!'}</span>{' '}
                          {durum.onde ? 'tempoda' : 'geride'}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>hedefsiz, izleniyor</div>
                )}
              </div>
            )
          })}
        </Kart>
      )}

      {/* Son 14 gün eğilimleri */}
      <Kart
        baslik="Son 14 gün"
        ikon="📈"
        sag={
          <button type="button" className="dugme px-2 py-1 text-xs" onClick={() => git('trendler')}>
            tümü
          </button>
        }
      >
        <div className="alan grid grid-cols-2 gap-x-4 gap-y-4">
          {ONE_CIKANLAR.filter((id) => !gizli.has(id)).map((id) => {
            const def = METRIKLER.find((m) => m.id === id)
            if (!def) return null
            const seri = metrikSerisi(pencere, gunler, id)
            const degerler = seri.map((n) => n.deger).filter((v): v is number => v !== null)
            const ozet = degerler.length === 0
              ? '—'
              : birikenMi(id)
                ? `${Math.round(degerler.reduce((a, b) => a + b, 0))} ${def.birim ?? ''}`
                : (degerler.reduce((a, b) => a + b, 0) / degerler.length).toFixed(1)
            return (
              <div key={id} className="min-w-0">
                <div className="flex items-baseline justify-between gap-1 mb-1">
                  <span className="text-xs truncate" style={{ color: 'var(--c-ink-3)' }}>{def.kisa}</span>
                  <span className="rakam text-sm font-semibold whitespace-nowrap">{ozet}</span>
                </div>
                <Sparkline
                  seri={seri}
                  renk={sutunRengi(def.pillar)}
                  etiket={`${def.label} son 14 gün eğilimi`}
                />
              </div>
            )
          })}
        </div>
      </Kart>

      {/* Hafta karşılaştırması */}
      <Kart
        baslik="Bu hafta ↔ geçen hafta"
        ikon="⚖️"
        sag={
          <button type="button" className="dugme px-2 py-1 text-xs" onClick={() => git('hafta')}>
            hafta
          </button>
        }
      >
        {yukselen.length === 0 && dusen.length === 0 ? (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Karşılaştırma için iki haftalık veri gerekiyor.
          </p>
        ) : (
          <div className="alan grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--d-iyi)' }}>
                <span aria-hidden="true">↑</span> Yükselen
              </div>
              {yukselen.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>—</div>
              ) : (
                yukselen.map((d) => (
                  <div key={d.def.id} className="flex justify-between gap-2 text-sm py-0.5">
                    <span className="truncate">{d.def.kisa}</span>
                    <span className="rakam whitespace-nowrap" style={{ color: 'var(--d-iyi)' }}>
                      %{Math.abs(d.yuzde!).toFixed(0)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--d-kotu)' }}>
                <span aria-hidden="true">↓</span> Düşen
              </div>
              {dusen.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>—</div>
              ) : (
                dusen.map((d) => (
                  <div key={d.def.id} className="flex justify-between gap-2 text-sm py-0.5">
                    <span className="truncate">{d.def.kisa}</span>
                    <span className="rakam whitespace-nowrap" style={{ color: 'var(--d-kotu)' }}>
                      %{Math.abs(d.yuzde!).toFixed(0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Kart>

      {/* Seriler */}
      <Kart baslik="Seriler" ikon="🔥" pillar="disiplin">
        <div className="alan grid grid-cols-2 gap-3">
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
      </Kart>
    </div>
  )
}
