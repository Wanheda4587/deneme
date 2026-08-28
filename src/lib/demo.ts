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

  for (let i = 0; i < gunSayisi; i++) {
    const date = gunEkle(baslangic, i)
    const t = i / Math.max(gunSayisi - 1, 1) // 0 → 1 arası ilerleme
    if (rnd() < 0.08) continue // arada atlanan günler gerçekçi olsun

    const gurultu = (o: number) => (rnd() - 0.5) * o
    const antrenmanaGitti = rnd() < 0.45 + t * 0.3

    gunler.push({
      date,
      antrenman: antrenmanaGitti,
      antrenmanVerimi: antrenmanaGitti
        ? Math.round(kenetle(55 + t * 25 + gurultu(30), 20, 100) / 5) * 5
        : undefined,
      antrenmanNotu: antrenmanaGitti ? '' : rnd() < 0.5 ? 'İş çıkışı geç oldu.' : '',
      uykuSaati: Math.round(kenetle(6.4 + t * 1.1 + gurultu(2), 4, 10) * 2) / 2,
      uykuKalitesi: Math.round(kenetle(5 + t * 2.5 + gurultu(3), 1, 10)),
      enerji: Math.round(kenetle(4.6 + t * 3 + gurultu(3), 1, 10)),
      mutluluk: Math.round(kenetle(5 + t * 2.4 + gurultu(3), 1, 10)),
      beslenme: Math.round(kenetle(4.8 + t * 2.8 + gurultu(3.5), 1, 10)),
      kaloriDengesi: Math.round(kenetle(-250 - t * 150 + gurultu(600), -1200, 800) / 50) * 50,
      isSaati: Math.round(kenetle(8 + gurultu(3), 0, 12) * 2) / 2,
      disiplin: Math.round(kenetle(42 + t * 38 + gurultu(35), 0, 100) / 5) * 5,
      sahneDk: rnd() < 0.35 + t * 0.35 ? Math.round(kenetle(15 + t * 45 + gurultu(40), 5, 150) / 5) * 5 : 0,
      kitapSayfa: rnd() < 0.5 + t * 0.3 ? Math.round(kenetle(12 + t * 25 + gurultu(30), 0, 90)) : 0,
      gelirDk: rnd() < 0.4 + t * 0.35 ? Math.round(kenetle(30 + t * 70 + gurultu(70), 10, 300) / 5) * 5 : 0,
      gelirVerimi: Math.round(kenetle(45 + t * 30 + gurultu(35), 10, 100) / 5) * 5,
      gunNotu: '',
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
      ozguvenNotu: t > 0.6 ? 'Sahnede daha rahattım, tanımadığım biriyle sohbet başlattım.' : 'Hâlâ tutukluk var.',
      bel: Math.round((94 - t * 4.2 + (rnd() - 0.5) * 0.6) * 2) / 2,
      kol: Math.round((36 + t * 1.8 + (rnd() - 0.5) * 0.4) * 2) / 2,
      kilo: Math.round((79.3 - t * 2.4 + (rnd() - 0.5) * 0.8) * 10) / 10,
      olcumKilitli: true,
      olcumTarihi: gunEkle(hb, 6),
      ozguvenIcinNeYaptim: '',
      haftaninKazanimi: '',
      enCokNeErteledim: '',
      gelecekHaftaOdagi: '',
      updatedAt: new Date().toISOString(),
    })
  })

  return { gunler, haftalar }
}
