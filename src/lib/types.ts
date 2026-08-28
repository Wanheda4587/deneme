// Uygulamanın tüm veri şekli burada tanımlı.
// Alan adları Supabase tablolarına birebir eşlenecek şekilde seçildi (Faz 4).

export type Pillar = 'vucut' | 'enerji' | 'disiplin' | 'ozguven' | 'gelir'

/** Bir günün kaydı. Anahtar: date (YYYY-MM-DD). */
export interface DayEntry {
  date: string

  // — Vücut —
  antrenman?: boolean
  antrenmanVerimi?: number // %0-100
  antrenmanNotu?: string // gittiyse not, gitmediyse sebep

  // — Enerji & Keyif —
  uykuSaati?: number
  uykuKalitesi?: number // 1-10
  enerji?: number // 1-10
  mutluluk?: number // 1-10
  beslenme?: number // 1-10
  kaloriDengesi?: number // eksi = açık, artı = fazla
  isSaati?: number

  // — Disiplin —
  disiplin?: number // %0-100, düşük = çok erteledim

  // — Özgüven & İletişim —
  sahneDk?: number
  kitapSayfa?: number

  // — Ek Gelir —
  gelirDk?: number
  gelirVerimi?: number // %0-100
  gelirNotu?: string

  gunNotu?: string
  updatedAt: string
}

/** Bir haftanın kaydı. Anahtar: weekStart (o haftanın Pazartesi'si, YYYY-MM-DD). */
export interface WeekEntry {
  weekStart: string

  ozguven?: number // 1-10
  ozguvenNotu?: string

  // Ölçümler — haftada TEK giriş. Kaydedilince kilitlenir.
  bel?: number
  kol?: number
  kilo?: number
  olcumTarihi?: string // ölçümün fiilen girildiği gün
  olcumKilitli?: boolean

  ozguvenIcinNeYaptim?: string
  haftaninKazanimi?: string
  enCokNeErteledim?: string
  gelecekHaftaOdagi?: string

  updatedAt: string
}

export interface Settings {
  kampBaslangic: string // YYYY-MM-DD
  kampGunSayisi: number
  gizliMetrikler: string[] // metrik id'leri — formda gizlenir
  tema: 'dark' | 'light'
}

export interface Backup {
  surum: 1
  disaAktarma: string
  days: DayEntry[]
  weeks: WeekEntry[]
  settings: Settings
}

/** Kullanıcının verdiği gerçek hedefler. */
export interface OlcumHedefi {
  id: 'bel' | 'kol'
  label: string
  baslangic: number
  hedef: number
  birim: string
}

export const OLCUM_HEDEFLERI: OlcumHedefi[] = [
  { id: 'bel', label: 'Bel', baslangic: 94, hedef: 88, birim: 'cm' },
  { id: 'kol', label: 'Kol', baslangic: 36, hedef: 39, birim: 'cm' },
]
