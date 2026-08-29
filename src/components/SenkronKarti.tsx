import { useEffect, useState } from 'react'
import { Alan, Kart } from './ui/Kart.tsx'
import { baglantiGecerliMi, baglantiOku, baglantiYaz } from '../lib/senkron/ayar.ts'
import { cikisYap, istemciSifirla, kodDogrula, kodGonder, oturum } from '../lib/senkron/istemci.ts'
import { useStore } from '../state/store.tsx'

function zamanYazisi(iso: string | null): string {
  if (!iso) return 'henüz senkronlanmadı'
  const fark = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (fark < 60) return 'az önce'
  if (fark < 3600) return `${Math.floor(fark / 60)} dakika önce`
  if (fark < 86400) return `${Math.floor(fark / 3600)} saat önce`
  return new Date(iso).toLocaleString('tr-TR')
}

export function SenkronKarti() {
  const { senkronDurumu, sonSenkron, senkronHatasi, senkronla, senkronDurumunuTazele } = useStore()
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [eposta, setEposta] = useState('')
  const [kod, setKod] = useState('')
  const [kodGonderildi, setKodGonderildi] = useState(false)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [hesap, setHesap] = useState<string | null>(null)

  useEffect(() => {
    const b = baglantiOku()
    if (b) {
      setUrl(b.url)
      setAnonKey(b.anonKey)
    }
    void oturum().then((o) => setHesap(o?.user?.email ?? null))
  }, [senkronDurumu])

  const calistir = async (is: () => Promise<void>, basarili?: string) => {
    setMesgul(true)
    setMesaj(null)
    try {
      await is()
      if (basarili) setMesaj(basarili)
    } catch (e) {
      setMesaj(e instanceof Error ? e.message : 'İşlem başarısız.')
    } finally {
      setMesgul(false)
    }
  }

  const baglan = () =>
    calistir(async () => {
      const sorun = baglantiGecerliMi(url, anonKey)
      if (sorun) throw new Error(sorun)
      baglantiYaz({ url: url.trim().replace(/\/$/, ''), anonKey: anonKey.trim() })
      istemciSifirla()
      await senkronDurumunuTazele()
    }, 'Bağlantı kaydedildi. Şimdi e-postanla giriş yap.')

  const baglantiyiKaldir = () =>
    calistir(async () => {
      await cikisYap().catch(() => {})
      baglantiYaz(null)
      istemciSifirla()
      setKodGonderildi(false)
      setHesap(null)
      await senkronDurumunuTazele()
    }, 'Bağlantı kaldırıldı. Verilerin bu cihazda duruyor.')

  const durumRozeti = () => {
    switch (senkronDurumu) {
      case 'kapali':
        return <span className="rozet">kapalı</span>
      case 'girisGerekli':
        return <span className="rozet rozet-uyari"><span aria-hidden="true">!</span> giriş gerekli</span>
      case 'calisiyor':
        return <span className="rozet">senkronlanıyor…</span>
      case 'hata':
        return <span className="rozet rozet-kotu"><span aria-hidden="true">!</span> hata</span>
      case 'hazir':
        return <span className="rozet rozet-iyi"><span aria-hidden="true">✓</span> açık</span>
    }
  }

  return (
    <Kart baslik="Cihazlar arası senkron" ikon="🔄" sag={durumRozeti()}>
      {mesaj && (
        <p className="alan text-sm" role="status" style={{ color: 'var(--c-ink-2)' }}>
          {mesaj}
        </p>
      )}
      {senkronHatasi && senkronDurumu === 'hata' && (
        <p className="alan text-sm" role="alert" style={{ color: 'var(--d-kotu)' }}>
          ⚠️ {senkronHatasi}
        </p>
      )}

      {senkronDurumu === 'kapali' ? (
        <>
          <div className="alan text-sm" style={{ color: 'var(--c-ink-2)' }}>
            <p>
              Şu an veriler yalnızca bu cihazda duruyor. Senkronu açarsan telefonda ve
              bilgisayarda aynı veriyi görürsün.
            </p>
            <ol className="mt-2 flex flex-col gap-1 text-xs" style={{ color: 'var(--c-ink-3)' }}>
              <li>1. supabase.com’da ücretsiz hesap aç ve yeni bir proje oluştur.</li>
              <li>2. Depodaki <code>supabase-kurulum.sql</code> dosyasının tamamını SQL Editor’e yapıştırıp çalıştır.</li>
              <li>3. Project Settings → API’den Project URL ve <strong>anon public</strong> anahtarını kopyala.</li>
              <li>4. Aşağıya yapıştır. Anahtarlar yalnızca bu cihazda saklanır, kod deposuna gitmez.</li>
            </ol>
          </div>
          <Alan etiket="Proje URL’si">
            <input
              className="girdi" value={url} placeholder="https://xxxx.supabase.co"
              aria-label="Supabase proje URL’si" autoCapitalize="off" autoCorrect="off"
              onChange={(e) => setUrl(e.target.value)}
            />
          </Alan>
          <Alan etiket="Anon public anahtarı" ipucu="service_role anahtarını DEĞİL, anon public olanı kullan.">
            <textarea
              className="girdi" rows={3} value={anonKey} placeholder="eyJhbGciOi..."
              aria-label="Supabase anon anahtarı" autoCapitalize="off" autoCorrect="off"
              onChange={(e) => setAnonKey(e.target.value)}
            />
          </Alan>
          <div className="alan">
            <button type="button" className="dugme dugme-vurgu w-full" disabled={mesgul} onClick={baglan}>
              Bağlan
            </button>
          </div>
        </>
      ) : senkronDurumu === 'girisGerekli' ? (
        <>
          <p className="alan text-sm" style={{ color: 'var(--c-ink-2)' }}>
            E-postana altı haneli bir kod göndereceğiz. Aynı e-postayı her iki cihazda da
            kullan — veriler o hesaba bağlanır.
          </p>
          <Alan etiket="E-posta">
            <input
              className="girdi" type="email" value={eposta} placeholder="ornek@eposta.com"
              aria-label="E-posta" autoCapitalize="off" autoCorrect="off"
              onChange={(e) => setEposta(e.target.value)}
            />
          </Alan>
          {kodGonderildi && (
            <Alan etiket="Gelen kod">
              <input
                className="girdi rakam" inputMode="numeric" value={kod} placeholder="123456"
                aria-label="Doğrulama kodu"
                onChange={(e) => setKod(e.target.value)}
              />
            </Alan>
          )}
          <div className="alan flex flex-wrap gap-2">
            <button
              type="button" className="dugme" disabled={mesgul || !eposta.trim()}
              onClick={() =>
                calistir(async () => {
                  await kodGonder(eposta)
                  setKodGonderildi(true)
                }, 'Kod gönderildi. Gelen kutunu kontrol et.')
              }
            >
              {kodGonderildi ? 'Kodu tekrar gönder' : 'Kod gönder'}
            </button>
            {kodGonderildi && (
              <button
                type="button" className="dugme dugme-vurgu flex-1" disabled={mesgul || kod.trim().length < 6}
                onClick={() =>
                  calistir(async () => {
                    await kodDogrula(eposta, kod)
                    setKod('')
                    setKodGonderildi(false)
                    await senkronDurumunuTazele()
                    await senkronla(true)
                  }, 'Giriş yapıldı, veriler senkronlandı.')
                }
              >
                Giriş yap
              </button>
            )}
          </div>
          <div className="alan">
            <button type="button" className="dugme dugme-tehlike" disabled={mesgul} onClick={baglantiyiKaldir}>
              Bağlantıyı kaldır
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="alan text-sm flex flex-col gap-1" style={{ color: 'var(--c-ink-2)' }}>
            {hesap && <div className="rakam">Hesap: <strong>{hesap}</strong></div>}
            <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
              Son senkron: {zamanYazisi(sonSenkron)}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
              Değişiklikler otomatik gönderiliyor. Diğer cihazı açtığında veriler kendiliğinden
              gelir; internetsizken girdiklerin bağlanınca yüklenir.
            </p>
          </div>
          <div className="alan flex flex-wrap gap-2">
            <button
              type="button" className="dugme dugme-vurgu flex-1"
              disabled={mesgul || senkronDurumu === 'calisiyor'}
              onClick={() => calistir(() => senkronla(true), 'Senkronlandı.')}
            >
              {senkronDurumu === 'calisiyor' ? 'Senkronlanıyor…' : '🔄 Şimdi senkronla'}
            </button>
            <button
              type="button" className="dugme" disabled={mesgul}
              onClick={() =>
                calistir(async () => {
                  await cikisYap()
                  setHesap(null)
                  await senkronDurumunuTazele()
                }, 'Çıkış yapıldı. Veriler bu cihazda duruyor.')
              }
            >
              Çıkış yap
            </button>
          </div>
          <div className="alan">
            <button type="button" className="dugme dugme-tehlike" disabled={mesgul} onClick={baglantiyiKaldir}>
              Bağlantıyı kaldır
            </button>
            <p className="ipucu">
              Kaldırmak buluttaki veriyi silmez, yalnızca bu cihazın bağlantısını keser.
            </p>
          </div>
        </>
      )}
    </Kart>
  )
}
