import { useRef, useState } from 'react'
import type { Backup, MikroHedef } from '../lib/types.ts'
import { yeniId } from '../lib/kimlik.ts'
import { Alan, Kart } from '../components/ui/Kart.tsx'
import { METRIKLER, SUTUNLAR, sutununMetrikleri } from '../lib/metrics.ts'
import { bugun as bugunIso, gunEkle, uzunTarih } from '../lib/date.ts'
import { demoUret } from '../lib/demo.ts'
import { useStore } from '../state/store.tsx'
import { SenkronKarti } from '../components/SenkronKarti.tsx'

// Demo verisinin gün sayısı — bugün kampın kaçıncı günü sayılacağını da belirler.
const DEMO_GUN = 14

export function Ayarlar() {
  const { ayarlar, gunler, haftalar, ayarGuncelle, disaAktar, iceAktar, hepsiniSil, topluYukle } =
    useStore()
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [onay, setOnay] = useState<'sil' | 'demo' | null>(null)
  const dosyaRef = useRef<HTMLInputElement>(null)

  const gizli = new Set(ayarlar.gizliMetrikler)
  const kampBitis = gunEkle(ayarlar.kampBaslangic, ayarlar.kampGunSayisi - 1)

  const bildir = (m: string) => {
    setMesaj(m)
    setTimeout(() => setMesaj((o) => (o === m ? null : o)), 4000)
  }

  const disaAktarmaYap = async () => {
    const yedek = await disaAktar()
    const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kamp90-yedek-${bugunIso()}.json`
    a.click()
    URL.revokeObjectURL(url)
    bildir(`Yedek indirildi: ${yedek.days.length} gün, ${yedek.weeks.length} hafta.`)
  }

  const iceAktarmaYap = async (dosya: File) => {
    try {
      const metin = await dosya.text()
      const yedek = JSON.parse(metin) as Backup
      if (!Array.isArray(yedek.days) || !Array.isArray(yedek.weeks)) {
        throw new Error('Dosya beklenen yedek biçiminde değil.')
      }
      await iceAktar(yedek)
      bildir(`Geri yüklendi: ${yedek.days.length} gün, ${yedek.weeks.length} hafta.`)
    } catch (e) {
      bildir(`İçe aktarılamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`)
    }
  }

  const metrikGorunurluk = (id: string, gorunur: boolean) => {
    const yeni = gorunur
      ? ayarlar.gizliMetrikler.filter((x) => x !== id)
      : [...ayarlar.gizliMetrikler, id]
    ayarGuncelle({ gizliMetrikler: yeni })
  }

  return (
    <div className="flex flex-col gap-4">
      {mesaj && (
        <p className="kart p-3 text-sm" role="status">{mesaj}</p>
      )}

      <SenkronKarti />

      {/* Kamp takvimi */}
      <Kart baslik="Kamp takvimi" ikon="🗓️">
        <Alan etiket="Başlangıç tarihi" ipucu={`Bitiş: ${uzunTarih(kampBitis)}`}>
          <input
            type="date"
            className="girdi"
            value={ayarlar.kampBaslangic}
            onChange={(e) => e.target.value && ayarGuncelle({ kampBaslangic: e.target.value })}
          />
        </Alan>
        <Alan etiket="Kamp uzunluğu" ipucu="91 gün = 13 tam hafta (Pazartesi–Pazar)">
          <div className="flex gap-2">
            {[90, 91].map((n) => (
              <button
                key={n}
                type="button"
                className="dugme flex-1"
                aria-pressed={ayarlar.kampGunSayisi === n}
                style={
                  ayarlar.kampGunSayisi === n
                    ? { background: 'var(--c-ink)', color: 'var(--c-bg)', borderColor: 'var(--c-ink)' }
                    : undefined
                }
                onClick={() => ayarGuncelle({ kampGunSayisi: n })}
              >
                {n} gün
              </button>
            ))}
          </div>
        </Alan>
      </Kart>

      {/* Görünüm */}
      <Kart baslik="Görünüm" ikon="🎨">
        <Alan etiket="Tema">
          <div className="segment" style={{ ['--sutun-renk' as string]: 'var(--p-vucut)' }}>
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="segment-dugme"
                aria-pressed={ayarlar.tema === t}
                onClick={() => ayarGuncelle({ tema: t })}
              >
                {t === 'dark' ? 'Koyu' : 'Açık'}
              </button>
            ))}
          </div>
        </Alan>
      </Kart>

      {/* Görünür metrikler */}
      <Kart baslik="Görünür alanlar" ikon="🔧">
        <p className="alan text-xs" style={{ color: 'var(--c-ink-3)' }}>
          Kullanmadığın alanı kapat, günlük form kısalsın. Kapatılan alanın geçmiş verisi silinmez —
          tekrar açtığında geri gelir.
        </p>
        {SUTUNLAR.map((s) => (
          <div key={s.id} className="alan">
            <div className="etiket">
              <span aria-hidden="true">{s.ikon}</span> {s.label}
            </div>
            <div className="flex flex-col gap-2">
              {sutununMetrikleri(s.id).map((m) => (
                <label key={m.id} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!gizli.has(m.id)}
                    onChange={(e) => metrikGorunurluk(m.id, e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: `var(--p-${s.id})` }}
                  />
                  <span style={{ color: gizli.has(m.id) ? 'var(--c-ink-3)' : 'var(--c-ink)' }}>
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Kart>

      {/* Veri */}
      <Kart baslik="Veri" ikon="💾">
        <div className="alan text-sm flex flex-col gap-1" style={{ color: 'var(--c-ink-2)' }}>
          <div className="rakam">
            <strong>{gunler.size}</strong> gün · <strong>{haftalar.size}</strong> hafta kaydı
          </div>
          <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
            Verilerin yalnızca bu cihazın tarayıcısında duruyor. Sunucuya veya kod deposuna
            gönderilmiyor. Başka bir cihaza taşımak için aşağıdan yedek al, diğer cihazda geri yükle.
          </p>
        </div>

        <div className="alan flex flex-wrap gap-2">
          <button type="button" className="dugme" onClick={() => void disaAktarmaYap()}>
            ⬇ Yedek al (JSON)
          </button>
          <button type="button" className="dugme" onClick={() => dosyaRef.current?.click()}>
            ⬆ Yedekten geri yükle
          </button>
          <input
            ref={dosyaRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void iceAktarmaYap(f)
              e.target.value = ''
            }}
          />
        </div>

        <div className="alan flex flex-col gap-2">
          {gunler.size > 0 && onay !== 'demo' ? (
            <>
              <button
                type="button"
                className="dugme dugme-tehlike self-start"
                onClick={() => setOnay('demo')}
              >
                🧪 Demo verisi yükle
              </button>
              <p className="text-xs" style={{ color: 'var(--d-kotu)' }}>
                ⚠️ Bu cihazda <strong>{gunler.size} günlük</strong> kaydın var. Demo verisi
                bunların üstüne yazar ve kamp başlangıç tarihini geriye alır. Gerçek veri
                giriyorsan bu düğmeye basma.
              </p>
            </>
          ) : (
          <button
            type="button"
            className="dugme self-start"
            onClick={async () => {
              // Demo verisinin her ekranda görünmesi için kamp penceresinin İÇİNE düşmesi
              // gerekir; bu yüzden başlangıç tarihi bugün 42. gün olacak şekilde geriye alınır.
              const eskiBaslangic = ayarlar.kampBaslangic
              const yeniBaslangic = gunEkle(bugunIso(), -(DEMO_GUN - 1))
              // Hiç mikro hedef yoksa örnek birkaç tane koy ki Panel boş görünmesin.
              const ornekHedefler: MikroHedef[] =
                ayarlar.mikroHedefler.length > 0
                  ? ayarlar.mikroHedefler
                  : [
                      { id: yeniId('mikro'), metrikId: 'kitapDk', hedef: 300, tur: 'toplam', yon: 'enAz', aktif: true },
                      { id: yeniId('mikro'), metrikId: 'kardiyoDk', hedef: 120, tur: 'toplam', yon: 'enAz', aktif: true },
                      { id: yeniId('mikro'), metrikId: 'sahneDk', hedef: 150, tur: 'toplam', yon: 'enAz', aktif: true },
                      { id: yeniId('mikro'), metrikId: 'disiplin', hedef: 75, tur: 'ortalama', yon: 'enAz', aktif: true },
                    ]
              ayarGuncelle({ kampBaslangic: yeniBaslangic, mikroHedefler: ornekHedefler })
              const { gunler: g, haftalar: h } = demoUret(
                bugunIso(), DEMO_GUN, yeniBaslangic, ayarlar.kampGunSayisi,
              )
              await topluYukle(g, h)
              setOnay(null)
              bildir(
                `${g.length} günlük demo verisi yüklendi. Kamp başlangıcı geçici olarak ` +
                  `${uzunTarih(yeniBaslangic)} yapıldı — gerçek tarihin ${uzunTarih(eskiBaslangic)} idi, ` +
                  'yukarıdaki "Başlangıç tarihi" alanından geri alabilirsin.',
              )
            }}
          >
            🧪 {onay === 'demo' ? 'Evet, üstüne yaz' : `Demo verisi yükle (${DEMO_GUN} gün)`}
          </button>
          )}
          {onay === 'demo' && (
            <button type="button" className="dugme self-start" onClick={() => setOnay(null)}>
              Vazgeç
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
            Grafikleri boş ekranda değil gerçek şekliyle görmek için. Kendi verinin üstüne yazar ve
            kamp başlangıç tarihini geriye alır — önce yedek al.
          </p>
        </div>

        <div className="alan flex flex-col gap-2">
          {onay === 'sil' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Tüm veriler silinsin mi? Geri alınamaz.</span>
              <button
                type="button"
                className="dugme dugme-tehlike"
                onClick={async () => {
                  await hepsiniSil()
                  setOnay(null)
                  bildir('Tüm veriler silindi.')
                }}
              >
                Evet, sil
              </button>
              <button type="button" className="dugme" onClick={() => setOnay(null)}>
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="dugme dugme-tehlike self-start"
              onClick={() => setOnay('sil')}
            >
              🗑 Tüm verileri sil
            </button>
          )}
        </div>
      </Kart>

      <p className="text-xs text-center px-4" style={{ color: 'var(--c-ink-3)' }}>
        {METRIKLER.length} metrik tanımlı · sürüm 0.1
      </p>
    </div>
  )
}
