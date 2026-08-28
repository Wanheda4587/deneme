// Grafikleri ve karşılaştırmaları boş ekranda değil gerçek şekliyle görebilmek için
// üretilen sahte veri. Yalnızca Ayarlar ekranından elle tetiklenir.
import type { DayEntry, WeekEntry } from './types.ts'
import { gunEkle, gunFarki, haftaBasi, kampGunleri } from './date.ts'

function rastgele(tohum: number): () => number {
  // Deterministik üreteç — aynı tohum aynı demo veriyi verir (mulberry32)
  let a = tohum
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const kenetle = (v: number, alt: number, ust: number) => Math.min(Math.max(v, alt), ust)

/**
 * `gunSayisi` günlük, hafif yükselen trendli demo veri üretir.
 * Bugünden geriye doğru doldurur; bazı günler bilinçli boş bırakılır.
 */
export function demoUret(
  bitisIso: string,
  gunSayisi: number,
  kampBaslangic: string,
  kampGunSayisi: number,
): { gunler: DayEntry[]; haftalar: WeekEntry[] } {
  const rnd = rastgele(20260831)
  const gunler: DayEntry[] = []
  const baslangic = gunEkle(bitisIso, -(gunSayisi - 1))

  const ANTRENMAN_NOTLARI = [
    'Göğüs–triceps. Bench 3x8, son set zorladı.',
    'Sırt–biceps. Barfikste 2 tekrar arttırdım.',
    'Bacak günü. Squat ağırlığı sabit, form düzeldi.',
    'Omuz. Yan raise\'lerde forma odaklandım.',
    'Push günü. Enerjim yüksekti, hacim arttı.',
  ]
  const GITMEME_SEBEPLERI = [
    'İş çıkışı geç oldu, salon kapanmıştı.',
    'Uykusuzdum, dinlenme günü yaptım.',
    'Bel ağrısı vardı, zorlamadım.',
  ]
  const GELIR_NOTLARI = [
    'Freelance teklifi için portföy sayfası hazırladım.',
    'YouTube videosu için senaryo yazdım.',
    'Eski müşteriye takip maili attım, görüşme ayarlandı.',
    'Fiyatlandırma araştırması yaptım.',
    'Video kurgusu — yarısını bitirdim.',
  ]
  const GUN_NOTLARI = [
    'Sabah ağır başladı ama akşama toparladım.',
    'Bugün ertelemeden yaptım, kendimi iyi hissettim.',
    'İş yoğundu, akşam enerji kalmadı.',
    'Sahne çalışması iyi geçti, akıcıydım.',
    'Beslenme kaydı, tatlıya yenildim.',
    'İyi bir gündü — her şeyi planladığım gibi yaptım.',
    'Sosyal ortamda daha rahattım, konuşmayı ben başlattım.',
  ]
  const sec = <T,>(dizi: T[]) => dizi[Math.floor(rnd() * dizi.length)]

  for (let i = 0; i < gunSayisi; i++) {
    const date = gunEkle(baslangic, i)
    const t = i / Math.max(gunSayisi - 1, 1) // 0 → 1 arası ilerleme
    const gurultu = (o: number) => (rnd() - 0.5) * o
    const antrenmanaGitti = rnd() < 0.5 + t * 0.3

    gunler.push({
      date,
      antrenman: antrenmanaGitti,
      antrenmanVerimi: antrenmanaGitti
        ? Math.round(kenetle(55 + t * 25 + gurultu(25), 25, 100) * 2) / 2
        : undefined,
      antrenmanNotu: antrenmanaGitti ? sec(ANTRENMAN_NOTLARI) : sec(GITMEME_SEBEPLERI),
      kardiyoDk: Math.round(kenetle(15 + t * 25 + gurultu(20), 0, 75) / 5) * 5,
      uykuSaati: Math.round(kenetle(6.4 + t * 1.1 + gurultu(1.6), 4.5, 9.5) * 4) / 4,
      uykuKalitesi: Math.round(kenetle(50 + t * 25 + gurultu(25), 10, 100) * 2) / 2,
      enerji: Math.round(kenetle(46 + t * 30 + gurultu(25), 10, 100) * 2) / 2,
      mutluluk: Math.round(kenetle(50 + t * 24 + gurultu(25), 10, 100) * 2) / 2,
      beslenme: Math.round(kenetle(48 + t * 28 + gurultu(30), 10, 100) * 2) / 2,
      kaloriDengesi: Math.round(kenetle(-250 - t * 150 + gurultu(500), -1100, 500) / 50) * 50,
      isSaati: Math.round(kenetle(8 + gurultu(3), 4, 12) * 4) / 4,
      disiplin: Math.round(kenetle(42 + t * 38 + gurultu(28), 10, 100) * 2) / 2,
      sahneDk: Math.round(kenetle(20 + t * 45 + gurultu(30), 5, 140) / 5) * 5,
      kitapDk: Math.round(kenetle(20 + t * 35 + gurultu(28), 5, 130) / 5) * 5,
      gelirDk: Math.round(kenetle(35 + t * 70 + gurultu(55), 10, 260) / 5) * 5,
      gelirVerimi: Math.round(kenetle(45 + t * 30 + gurultu(28), 15, 100) * 2) / 2,
      gelirNotu: sec(GELIR_NOTLARI),
      gunNotu: sec(GUN_NOTLARI),
      updatedAt: new Date().toISOString(),
    })
  }

  // Haftalık kayıtlar: özgüven + kilitli ölçümler (bel düşer, kol büyür)
  const haftalar: WeekEntry[] = []
  const kampTumGunler = kampGunleri(kampBaslangic, kampGunSayisi)
  const haftaSet = new Set(gunler.map((g) => haftaBasi(g.date)))
  const siraliHaftalar = [...haftaSet].sort()

  siraliHaftalar.forEach((hb, i) => {
    const t = siraliHaftalar.length > 1 ? i / (siraliHaftalar.length - 1) : 0
    const kampIci = kampTumGunler.includes(hb) || gunFarki(kampBaslangic, hb) >= 0
    if (!kampIci) return
    haftalar.push({
      weekStart: hb,
      ozguven: Math.round(kenetle(4 + t * 3.5 + (rnd() - 0.5) * 1.5, 1, 10)),
      ozguvenNotu:
        t > 0.6
          ? 'Sahnede belirgin şekilde daha rahattım; tanımadığım biriyle ben sohbet başlattım.'
          : 'Kalabalıkta hâlâ tutukluk var, konuşmayı başlatmakta zorlanıyorum.',
      olcumler: {
        bel: Math.round((94 - t * 4.2 + (rnd() - 0.5) * 0.6) * 2) / 2,
        kol: Math.round((36 + t * 1.8 + (rnd() - 0.5) * 0.4) * 2) / 2,
        kilo: Math.round((79.3 - t * 2.4 + (rnd() - 0.5) * 0.8) * 10) / 10,
      },
      olcumKilitli: true,
      olcumTarihi: gunEkle(hb, 6),
      ozguvenIcinNeYaptim:
        t > 0.5
          ? 'Sahne programına düzenli çalıştım ve iki kez yeni biriyle konuşma başlattım.'
          : 'Aynaya karşı prova yaptım ama sosyal ortamda denemedim.',
      haftaninKazanimi:
        t > 0.5
          ? 'Antrenmanı hiç aksatmadım ve disiplin puanım ilk kez %80 üstüne çıktı.'
          : 'Uyku düzenim oturmaya başladı.',
      enCokNeErteledim:
        t > 0.5 ? 'Ek gelir için teklif hazırlamayı iki gün öteledim.' : 'Sabah antrenmanlarını sürekli akşama attım.',
      gelecekHaftaOdagi:
        t > 0.5 ? 'Kitap süresini günde 45 dakikaya çıkarmak.' : 'Her gün en az bir kez sohbet başlatmak.',
      updatedAt: new Date().toISOString(),
    })
  })

  return { gunler, haftalar }
}
