// Tarih yardımcıları. Saat dilimi sorunlarını önlemek için tüm Date nesneleri
// yerel saatle öğlen 12:00'de kurulur; yaz saati geçişlerinde gün kaymaz.

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const GUNLER_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

export function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

export function tarih(isoStr: string): Date {
  const [y, m, g] = isoStr.split('-').map(Number)
  return new Date(y, m - 1, g, 12, 0, 0, 0)
}

export function bugun(): string {
  return iso(new Date())
}

export function gunEkle(isoStr: string, n: number): string {
  const d = tarih(isoStr)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** İki tarih arasındaki tam gün farkı (b - a). */
export function gunFarki(a: string, b: string): number {
  const ms = tarih(b).getTime() - tarih(a).getTime()
  return Math.round(ms / 86400000)
}

/** Verilen günün ait olduğu haftanın Pazartesi'si. */
export function haftaBasi(isoStr: string): string {
  const d = tarih(isoStr)
  const gun = d.getDay() // 0 = Pazar
  const geri = gun === 0 ? 6 : gun - 1
  return gunEkle(isoStr, -geri)
}

/** Verilen günün ait olduğu haftanın Pazar'ı. */
export function haftaSonu(isoStr: string): string {
  return gunEkle(haftaBasi(isoStr), 6)
}

export function pazarMi(isoStr: string): boolean {
  return tarih(isoStr).getDay() === 0
}

export function gunAdi(isoStr: string): string {
  return GUNLER[tarih(isoStr).getDay()]
}

export function gunAdiKisa(isoStr: string): string {
  return GUNLER_KISA[tarih(isoStr).getDay()]
}

/** "28 Ağustos 2026, Cuma" */
export function uzunTarih(isoStr: string): string {
  const d = tarih(isoStr)
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${GUNLER[d.getDay()]}`
}

/** "28 Ağu" */
export function kisaTarih(isoStr: string): string {
  const d = tarih(isoStr)
  return `${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`
}

/** Kampın kaçıncı günü (1 tabanlı). Kamp dışındaysa null. */
export function kampGunu(isoStr: string, baslangic: string, toplamGun: number): number | null {
  const n = gunFarki(baslangic, isoStr) + 1
  return n >= 1 && n <= toplamGun ? n : null
}

/** Kampın kaçıncı haftası (1 tabanlı). Kamp dışındaysa null. */
export function kampHaftasi(isoStr: string, baslangic: string, toplamGun: number): number | null {
  const gun = kampGunu(isoStr, baslangic, toplamGun)
  return gun === null ? null : Math.ceil(gun / 7)
}

/** Kampın tüm günleri, sırayla. */
export function kampGunleri(baslangic: string, toplamGun: number): string[] {
  return Array.from({ length: toplamGun }, (_, i) => gunEkle(baslangic, i))
}

/** Kampın tüm hafta başlangıçları (Pazartesi'ler), sırayla. */
export function kampHaftalari(baslangic: string, toplamGun: number): string[] {
  const ilk = haftaBasi(baslangic)
  const adet = Math.ceil(toplamGun / 7)
  return Array.from({ length: adet }, (_, i) => gunEkle(ilk, i * 7))
}

/** Bir haftanın 7 günü (Pazartesi → Pazar). */
export function haftaninGunleri(haftaBasiIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasiIso, i))
}
