import { useState } from 'react'
import type { WeekEntry } from '../lib/types.ts'
import { Alan, Kart } from '../components/ui/Kart.tsx'
import { MetinAlani, Olcek, Sayi } from '../components/ui/Girdiler.tsx'
import { HaftaKarsilastirma } from '../components/HaftaKarsilastirma.tsx'
import { MikroHedefListesi } from '../components/MikroHedefListesi.tsx'
import {
  bugun as bugunIso,
  gunEkle,
  gunFarki,
  haftaBasi,
  haftaninGunleri,
  kampGunleri,
  kampHaftasi,
  kisaTarih,
  pazarMi,
  uzunTarih,
} from '../lib/date.ts'
import {
  etkinCaba,
  haftaOzeti,
  kaloriBicimi,
  kaloriOzeti,
  sureBicimi,
  toplam,
  yuzdeDegisim,
} from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

const METIN_ALANLARI = [
  { id: 'ozguvenIcinNeYaptim', label: 'Bu hafta özgüvenim için ne yaptım?', ph: 'Hangi adımı attım?' },
  { id: 'haftaninKazanimi', label: 'Haftanın kazanımı', ph: 'Ne iyi gitti?' },
  { id: 'enCokNeErteledim', label: 'Bu hafta en çok ne erteledim?', ph: 'Hangi işi sürekli öteledim?' },
  { id: 'gelecekHaftaOdagi', label: 'Gelecek hafta odağım', ph: 'Tek cümleyle.' },
] as const

export function Hafta() {
  const { gunler, haftalar, ayarlar, haftaGuncelle } = useStore()
  const [hafta, setHafta] = useState(() => haftaBasi(bugunIso()))
  const [kilitAcik, setKilitAcik] = useState(false)

  // Kilit yalnızca açıldığı hafta için geçerli olmalı; başka haftaya geçince
  // o haftanın ölçümü yanlışlıkla düzenlenebilir görünmesin.
  const haftayaGit = (yeni: string) => {
    setHafta(yeni)
    setKilitAcik(false)
  }

  const { kampBaslangic, kampGunSayisi, olcumHedefleri } = ayarlar
  const kayit: WeekEntry = haftalar.get(hafta) ?? { weekStart: hafta, updatedAt: '' }
  const oncekiKayit = haftalar.get(gunEkle(hafta, -7))
  const haftaNo = kampHaftasi(hafta, kampBaslangic, kampGunSayisi)
  const gunlerBu = haftaninGunleri(hafta)
  const gizli = new Set(ayarlar.gizliMetrikler)
  const olcumler = kayit.olcumler ?? {}

  // ── Otomatik özet ──
  const antrenmanGun = gunlerBu.filter((g) => gunler.get(g)?.antrenman === true).length
  const antrenmanVerim = haftaOzeti(hafta, gunler, 'antrenmanVerimi').ortalama
  const kardiyoTop = haftaOzeti(hafta, gunler, 'kardiyoDk').toplam
  const disiplinOrt = haftaOzeti(hafta, gunler, 'disiplin').ortalama
  const disiplinGecen = haftaOzeti(gunEkle(hafta, -7), gunler, 'disiplin').ortalama
  const sahneTop = haftaOzeti(hafta, gunler, 'sahneDk').toplam
  const kitapTop = haftaOzeti(hafta, gunler, 'kitapDk').toplam
  const gelirCaba = toplam(gunlerBu.map((g) => etkinCaba(gunler.get(g))))
  const uykuOrt = haftaOzeti(hafta, gunler, 'uykuSaati').ortalama

  // Kalori: bu haftanın neti ve kamp başından bugüne kümülatif net
  const haftaKalori = kaloriOzeti(gunlerBu, gunler)
  const kampBugüneKadar = kampGunleri(kampBaslangic, kampGunSayisi).filter(
    (g) => gunFarki(g, bugunIso()) >= 0,
  )
  const toplamKalori = kaloriOzeti(kampBugüneKadar, gunler)
  const ozguvenDegisim = yuzdeDegisim(oncekiKayit?.ozguven ?? null, kayit.ozguven ?? null)

  const olcumKilitli = kayit.olcumKilitli === true && !kilitAcik
  const olcumGirildi = Object.keys(olcumler).length > 0

  const guncelle = (yama: Partial<WeekEntry>) => haftaGuncelle(hafta, yama)
  const olcumYaz = (id: string, deger: number | undefined) => {
    const yeni = { ...olcumler }
    if (deger === undefined) delete yeni[id]
    else yeni[id] = deger
    guncelle({ olcumler: yeni })
  }

  const ozetler: { etiket: string; deger: string; alt?: string }[] = [
    { etiket: 'Antrenman', deger: `${antrenmanGun}/7 gün`, alt: antrenmanVerim !== null ? `ort. %${antrenmanVerim.toFixed(0)} verim` : undefined },
    { etiket: 'Kardiyo', deger: `${kardiyoTop} dk` },
    { etiket: 'Disiplin', deger: disiplinOrt !== null ? `%${disiplinOrt.toFixed(0)}` : '—', alt: disiplinGecen !== null ? `geçen hafta %${disiplinGecen.toFixed(0)}` : undefined },
    { etiket: 'Sahne', deger: `${sahneTop} dk` },
    { etiket: 'Kitap', deger: `${kitapTop} dk` },
    { etiket: 'Ek gelir etkin çaba', deger: `${Math.round(gelirCaba)} dk`, alt: 'dakika × verim' },
    { etiket: 'Ortalama uyku', deger: sureBicimi(uykuOrt) },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Hafta gezinme */}
      <div className="kart p-3 flex items-center gap-2">
        <button type="button" className="dugme" aria-label="Önceki hafta" onClick={() => haftayaGit(gunEkle(hafta, -7))}>‹</button>
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-semibold">
            {haftaNo !== null ? `${haftaNo}. hafta` : 'Kamp dışı hafta'}
          </div>
          <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
            {kisaTarih(hafta)} – {kisaTarih(gunEkle(hafta, 6))}
          </div>
        </div>
        <button type="button" className="dugme" aria-label="Sonraki hafta" disabled={hafta >= haftaBasi(bugunIso())} onClick={() => haftayaGit(gunEkle(hafta, 7))}>›</button>
      </div>

      {!pazarMi(bugunIso()) && hafta === haftaBasi(bugunIso()) && (
        <p className="text-xs px-1" style={{ color: 'var(--c-ink-3)' }}>
          Haftalık değerlendirmeyi Pazar günü doldurmak için tasarlandı — ama istediğin an girebilirsin.
        </p>
      )}

      {/* Bu haftanın mikro hedefleri */}
      <Kart baslik="Bu haftanın hedefleri" ikon="🎯">
        <MikroHedefListesi haftaBasiIso={hafta} />
      </Kart>

      {/* Otomatik özet — girilmez, hesaplanır */}
      <Kart baslik="Haftanın özeti" ikon="📊">
        <div className="alan grid grid-cols-2 gap-3">
          {ozetler.map((o) => (
            <div key={o.etiket}>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>{o.etiket}</div>
              <div className="rakam font-semibold">{o.deger}</div>
              {o.alt && <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>{o.alt}</div>}
            </div>
          ))}
        </div>

        {/* Kalori dengesi — haftalık net ve kamp başından beri toplam */}
        <div className="alan">
          <div className="etiket">Kalori dengesi</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Bu hafta</div>
              <div
                className="rakam font-semibold text-lg"
                style={{ color: haftaKalori.doluGun === 0 ? 'var(--c-ink-3)' : undefined }}
              >
                {haftaKalori.doluGun === 0 ? '—' : kaloriBicimi(haftaKalori.net)}
              </div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {haftaKalori.doluGun === 0
                  ? 'giriş yok'
                  : haftaKalori.net < 0
                    ? `${haftaKalori.doluGun} günde açık verdin`
                    : haftaKalori.net > 0
                      ? `${haftaKalori.doluGun} günde fazla aldın`
                      : `${haftaKalori.doluGun} günde başabaş`}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Kamp başından beri</div>
              <div
                className="rakam font-semibold text-lg"
                style={{ color: toplamKalori.doluGun === 0 ? 'var(--c-ink-3)' : undefined }}
              >
                {toplamKalori.doluGun === 0 ? '—' : kaloriBicimi(toplamKalori.net)}
              </div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {toplamKalori.doluGun === 0
                  ? 'giriş yok'
                  : `${toplamKalori.doluGun} günün toplamı`}
              </div>
            </div>
          </div>
          <p className="ipucu">Eksi = yaktığından az aldın (açık). Artı = fazla aldın.</p>
        </div>
      </Kart>

      {/* Özgüven */}
      <Kart baslik="Özgüven" ikon="🎤" pillar="ozguven">
        <Alan
          etiket="Bu haftaki özgüven puanım"
          sag={
            ozguvenDegisim !== null ? (
              <span
                className={`rozet ${ozguvenDegisim > 0 ? 'rozet-iyi' : ozguvenDegisim < 0 ? 'rozet-kotu' : ''}`}
              >
                <span aria-hidden="true">{ozguvenDegisim > 0 ? '↑' : ozguvenDegisim < 0 ? '↓' : '→'}</span>
                %{Math.abs(ozguvenDegisim).toFixed(0)} geçen haftaya göre
              </span>
            ) : undefined
          }
        >
          <Olcek
            deger={kayit.ozguven}
            onChange={(v) => guncelle({ ozguven: v })}
            etiketi="Özgüven puanı"
          />
        </Alan>
        <Alan etiket="Neden bu puan?">
          <MetinAlani
            deger={kayit.ozguvenNotu}
            onChange={(v) => guncelle({ ozguvenNotu: v })}
            placeholder="Bu hafta özgüvenimi ne yükseltti, ne düşürdü?"
            satir={3}
            etiketi="Özgüven notu"
          />
        </Alan>
      </Kart>

      {/* Ölçümler — haftada TEK giriş */}
      <Kart
        baslik="Ölçümler"
        ikon="📏"
        pillar="vucut"
        sag={olcumKilitli ? <span className="rozet"><span aria-hidden="true">🔒</span> kilitli</span> : undefined}
      >
        {olcumHedefleri.length === 0 ? (
          <p className="alan text-sm" style={{ color: 'var(--c-ink-3)' }}>
            Tanımlı ölçüm yok. Hedefler ekranından ekleyebilirsin.
          </p>
        ) : olcumKilitli ? (
          <div className="alan flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              {olcumHedefleri.map((h) => (
                <div key={h.id}>
                  <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>{h.label}</div>
                  <div className="rakam font-semibold text-lg">
                    {olcumler[h.id] ?? '—'}
                    <span className="text-xs font-normal" style={{ color: 'var(--c-ink-3)' }}>
                      {' '}{h.birim}
                    </span>
                  </div>
                  {h.hedef !== null && (
                    <div className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }}>
                      hedef {h.hedef} {h.birim}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {kayit.olcumTarihi && (
              <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {uzunTarih(kayit.olcumTarihi)} tarihinde girildi. Bu hafta için ölçüm tamamlandı.
              </p>
            )}
            <button type="button" className="dugme self-start" onClick={() => setKilitAcik(true)}>
              Yanlış girdim, düzelt
            </button>
          </div>
        ) : (
          <>
            <p className="alan text-xs" style={{ color: 'var(--c-ink-3)' }}>
              Ölçümler haftada <strong>bir kez</strong> girilir. Kaydettikten sonra bu hafta için
              kilitlenir — ikinci bir giriş kabul edilmez.
            </p>
            {olcumHedefleri.map((h) => (
              <Alan key={h.id} etiket={h.label}>
                <Sayi
                  deger={olcumler[h.id]}
                  onChange={(v) => olcumYaz(h.id, v)}
                  min={0}
                  max={500}
                  adim={h.birim === 'kg' ? 0.1 : 0.5}
                  birim={h.birim}
                  etiketi={h.label}
                />
              </Alan>
            ))}
            <div className="alan">
              <button
                type="button"
                className="dugme dugme-vurgu w-full"
                disabled={!olcumGirildi}
                onClick={() => {
                  guncelle({ olcumKilitli: true, olcumTarihi: bugunIso() })
                  setKilitAcik(false)
                }}
              >
                Ölçümü kaydet ve kilitle
              </button>
              {!olcumGirildi && <p className="ipucu">Kaydetmek için en az bir ölçüm gir.</p>}
            </div>
          </>
        )}
      </Kart>

      {/* Haftalık değerlendirme metinleri */}
      <Kart baslik="Haftalık değerlendirme" ikon="📝">
        {METIN_ALANLARI.map((a) => (
          <Alan key={a.id} etiket={a.label}>
            <MetinAlani
              deger={kayit[a.id]}
              onChange={(v) => guncelle({ [a.id]: v } as Partial<WeekEntry>)}
              placeholder={a.ph}
              satir={2}
              etiketi={a.label}
            />
          </Alan>
        ))}
      </Kart>

      {/* Bu hafta vs geçen hafta */}
      <Kart baslik="Bu hafta ↔ geçen hafta" ikon="⚖️">
        <HaftaKarsilastirma haftaBasiIso={hafta} kayitlar={gunler} gizli={gizli} />
      </Kart>
    </div>
  )
}
