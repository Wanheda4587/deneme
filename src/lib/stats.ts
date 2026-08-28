// İstatistik yardımcıları. Hiçbiri kullanıcıdan girdi almaz — hepsi türetilir.
import type { DayEntry, MikroHedef, MikroTur } from './types.ts'
import type { MetrikId, MetricDef } from './metrics.ts'
import { metrik } from './metrics.ts'
import { haftaninGunleri } from './date.ts'

export interface NoktaSerisi {
  date: string
  deger: number | null
}

/** Bir metriğin ham günlük değerini sayıya çevirir (boolean → 1/0). */
export function metrikDegeri(gun: DayEntry | undefined, id: MetrikId): number | null {
  if (!gun) return null
  const ham = gun[id]
  if (ham === undefined || ham === null) return null
  if (typeof ham === 'boolean') return ham ? 1 : 0
  if (typeof ham === 'number') return Number.isFinite(ham) ? ham : null
  return null
}

/** Verilen gün listesi için metriğin zaman serisi (boş günler null). */
export function metrikSerisi(
  gunler: string[],
  kayitlar: Map<string, DayEntry>,
  id: MetrikId,
): NoktaSerisi[] {
  return gunler.map((date) => ({ date, deger: metrikDegeri(kayitlar.get(date), id) }))
}

export function ortalama(degerler: (number | null | undefined)[]): number | null {
  const v = degerler.filter((d): d is number => typeof d === 'number' && Number.isFinite(d))
  if (v.length === 0) return null
  return v.reduce((a, b) => a + b, 0) / v.length
}

export function toplam(degerler: (number | null | undefined)[]): number {
  return degerler.reduce<number>(
    (a, b) => a + (typeof b === 'number' && Number.isFinite(b) ? b : 0),
    0,
  )
}

export function doluGunSayisi(degerler: (number | null | undefined)[]): number {
  return degerler.filter((d) => typeof d === 'number' && Number.isFinite(d)).length
}

/**
 * Sondan geriye bakan hareketli ortalama. Boş günler ortalamayı bozmaz —
 * pencere içindeki dolu günlerin ortalaması alınır, hiç dolu gün yoksa null.
 */
export function hareketliOrtalama(seri: NoktaSerisi[], pencere = 7): NoktaSerisi[] {
  return seri.map((nokta, i) => {
    const bas = Math.max(0, i - pencere + 1)
    const dilim = seri.slice(bas, i + 1).map((n) => n.deger)
    return { date: nokta.date, deger: ortalama(dilim) }
  })
}

/** Yüzde değişim. Önceki değer 0 veya yoksa null (bölme anlamsız olurdu). */
export function yuzdeDegisim(onceki: number | null, simdi: number | null): number | null {
  if (onceki === null || simdi === null) return null
  if (onceki === 0) return null
  return ((simdi - onceki) / Math.abs(onceki)) * 100
}

/** Değişimin "iyi mi kötü mü" olduğu — metriğin yön tercihine göre. */
export function degisimYonu(
  def: MetricDef,
  fark: number | null,
): 'iyi' | 'kotu' | 'notr' {
  if (fark === null || Math.abs(fark) < 1e-9 || def.yon === 'yok') return 'notr'
  if (def.yon === 'yuksek') return fark > 0 ? 'iyi' : 'kotu'
  return fark < 0 ? 'iyi' : 'kotu'
}

export interface SeriBilgisi {
  guncel: number
  enUzun: number
}

/** Ardışık gün serisi. `kosul` sağlanan günler sayılır; bugüne kadar bakılır. */
export function seriHesapla(
  gunler: string[],
  kayitlar: Map<string, DayEntry>,
  kosul: (g: DayEntry | undefined) => boolean,
): SeriBilgisi {
  let enUzun = 0
  let sayac = 0
  for (const g of gunler) {
    if (kosul(kayitlar.get(g))) {
      sayac++
      if (sayac > enUzun) enUzun = sayac
    } else {
      sayac = 0
    }
  }
  return { guncel: sayac, enUzun }
}

/** Bir haftanın (Pazartesi başlangıçlı) metrik özeti. */
export interface HaftaOzeti {
  haftaBasi: string
  ortalama: number | null
  toplam: number
  doluGun: number
}

export function haftaOzeti(
  haftaBasiIso: string,
  kayitlar: Map<string, DayEntry>,
  id: MetrikId,
): HaftaOzeti {
  const degerler = haftaninGunleri(haftaBasiIso).map((g) => metrikDegeri(kayitlar.get(g), id))
  return {
    haftaBasi: haftaBasiIso,
    ortalama: ortalama(degerler),
    toplam: toplam(degerler),
    doluGun: doluGunSayisi(degerler),
  }
}

/** Metriğin doğal özet biçimi: süreler toplanır, puanlar ortalanır. */
const BIRIKENLER = new Set<string>(['sahneDk', 'kitapDk', 'gelirDk', 'kardiyoDk'])

export function birikenMi(id: MetrikId): boolean {
  return BIRIKENLER.has(id)
}

/** Bir metrik için varsayılan haftalık ölçme biçimi. */
export function varsayilanTur(id: MetrikId): MikroTur {
  if (birikenMi(id)) return 'toplam'
  if (metrik(id)?.type === 'bool') return 'gun'
  return 'ortalama'
}

export function haftaDegeri(ozet: HaftaOzeti, id: MetrikId): number | null {
  if (birikenMi(id)) return ozet.doluGun > 0 ? ozet.toplam : null
  return ozet.ortalama
}

/** Etkin çaba = dakika × verim% — hem hacmi hem kaliteyi tek sayıda toplar. */
export function etkinCaba(gun: DayEntry | undefined): number | null {
  if (!gun) return null
  const dk = gun.gelirDk
  const verim = gun.gelirVerimi
  if (typeof dk !== 'number') return null
  if (typeof verim !== 'number') return dk
  return (dk * verim) / 100
}

// ── Ölçüm hedefleri (bel / kol) ────────────────────────────────────────────

export interface HedefDurumu {
  guncel: number | null
  baslangic: number
  hedef: number
  /** Kat edilen yolun yüzdesi (0-100, aşarsa 100'ü geçebilir). */
  ilerleme: number | null
  /** Bugün itibarıyla olunması gereken değer. */
  beklenen: number
  /** Beklenene göre fark — hedef yönünde pozitifse öndesin. */
  fark: number | null
  onde: boolean | null
  kalanGun: number
}

export function hedefDurumu(
  baslangic: number,
  hedef: number,
  guncel: number | null,
  gecenGun: number,
  toplamGun: number,
): HedefDurumu {
  const oran = Math.min(Math.max(gecenGun / toplamGun, 0), 1)
  const beklenen = baslangic + (hedef - baslangic) * oran
  const menzil = hedef - baslangic
  const ilerleme = guncel === null || menzil === 0 ? null : ((guncel - baslangic) / menzil) * 100
  // Hedef yönünde ne kadar öndeyiz: menzil işaretine göre normalize edilir.
  const fark = guncel === null ? null : (guncel - beklenen) * Math.sign(menzil)
  return {
    guncel,
    baslangic,
    hedef,
    ilerleme,
    beklenen,
    fark,
    onde: fark === null ? null : fark >= 0,
    kalanGun: Math.max(toplamGun - gecenGun, 0),
  }
}

// ── Mikro hedefler (haftalık somut hedefler) ────────────────────────────────

/** Bir metriğin haftalık değeri, seçilen ölçme biçimine göre. */
export function haftalikDeger(
  haftaBasiIso: string,
  kayitlar: Map<string, DayEntry>,
  id: MetrikId,
  tur: MikroTur,
): number {
  const degerler = haftaninGunleri(haftaBasiIso).map((g) => metrikDegeri(kayitlar.get(g), id))
  if (tur === 'toplam') return toplam(degerler)
  if (tur === 'gun') return degerler.filter((d) => d !== null && d > 0).length
  return ortalama(degerler) ?? 0
}

export interface MikroDurum {
  hedef: MikroHedef
  def: MetricDef
  /** Bu haftaki mevcut değer. */
  simdi: number
  /** Hedefe kalan (enAz için eksik, enFazla için kalan bütçe). Negatifse aşılmış. */
  kalan: number
  /** 0-1+ arası ilerleme oranı. */
  oran: number
  tamam: boolean
  /** Haftanın bitmesine kalan gün (bugün dahil). */
  kalanGun: number
  /** Hedefe yetişmek için günlük gereken tempo (yalnızca toplam/gün türünde anlamlı). */
  gunlukGereken: number | null
}

export function mikroDurum(
  hedef: MikroHedef,
  haftaBasiIso: string,
  kayitlar: Map<string, DayEntry>,
  bugunIso: string,
): MikroDurum | null {
  const def = metrik(hedef.metrikId as MetrikId)
  if (!def) return null

  const simdi = haftalikDeger(haftaBasiIso, kayitlar, hedef.metrikId as MetrikId, hedef.tur)
  // Haftanın bitmesine kalan gün — bugün dahil. Geçmiş bir haftaya bakılıyorsa 0.
  const kalanGun = haftaninGunleri(haftaBasiIso).filter((g) => g >= bugunIso).length

  if (hedef.yon === 'enFazla') {
    const kalan = hedef.hedef - simdi
    return {
      hedef, def, simdi, kalan,
      oran: hedef.hedef === 0 ? 0 : simdi / hedef.hedef,
      tamam: simdi <= hedef.hedef,
      kalanGun,
      gunlukGereken: null,
    }
  }

  const kalan = Math.max(hedef.hedef - simdi, 0)
  return {
    hedef, def, simdi, kalan,
    oran: hedef.hedef === 0 ? 1 : simdi / hedef.hedef,
    tamam: simdi >= hedef.hedef,
    kalanGun,
    gunlukGereken:
      hedef.tur === 'ortalama' || kalan === 0 || kalanGun === 0 ? null : kalan / kalanGun,
  }
}

/** Mikro hedefin okunur birimi ve biçimi. Yüzde Türkçedeki gibi başa yazılır. */
export function mikroBicim(durum: MikroDurum, deger: number): string {
  const { def, hedef } = durum
  if (hedef.tur === 'gun') return `${Math.round(deger)} gün`
  if (def.type === 'sure') return sureBicimi(deger)
  const yuvarlak = Number.isInteger(deger) ? String(deger) : deger.toFixed(1)
  if (def.type === 'percent') return `%${yuvarlak}`
  return def.birim ? `${yuvarlak} ${def.birim}` : yuvarlak
}

// ── Biçimlendirme ve kalori özeti ──────────────────────────────────────────

/** Ondalık saati "7 sa 15 dk" biçimine çevirir. */
export function sureBicimi(saatOndalik: number | null): string {
  if (saatOndalik === null) return '—'
  const toplamDk = Math.round(saatOndalik * 60)
  const sa = Math.floor(toplamDk / 60)
  const dk = toplamDk % 60
  if (sa === 0) return `${dk} dk`
  if (dk === 0) return `${sa} sa`
  return `${sa} sa ${dk} dk`
}

/** Binlik ayraçlı, işaretli kalori yazısı: "−2.000 kcal" / "+450 kcal". */
export function kaloriBicimi(net: number): string {
  const isaret = net < 0 ? '−' : net > 0 ? '+' : ''
  return `${isaret}${Math.abs(Math.round(net)).toLocaleString('tr-TR')} kcal`
}

export interface KaloriOzeti {
  /** Girilen günlerin toplamı. Eksi = açık verilmiş, artı = fazla alınmış. */
  net: number
  /** Kaç güne kalori girilmiş. */
  doluGun: number
}

/** Verilen günler için net kalori dengesi. */
export function kaloriOzeti(
  gunler: string[],
  kayitlar: Map<string, DayEntry>,
): KaloriOzeti {
  const degerler = gunler.map((g) => metrikDegeri(kayitlar.get(g), 'kaloriDengesi'))
  return { net: toplam(degerler), doluGun: doluGunSayisi(degerler) }
}
