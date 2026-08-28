// Uygulamanın tüm veri şekli burada tanımlı.
// Alan adları Supabase tablolarına birebir eşlenecek şekilde seçildi (Faz 4).

export type Pillar = 'vucut' | 'enerji' | 'disiplin' | 'ozguven' | 'gelir'

/** Bir günün kaydı. Anahtar: date (YYYY-MM-DD). */
export interface DayEntry {
  date: string

  // — Vücut —
  antrenman?: boolean
  antrenmanVerimi?: number // %0-100
  kardiyoDk?: number
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
  kitapDk?: number

  // — Ek Gelir —
  gelirDk?: number
  gelirVerimi?: number // %0-100
  gelirNotu?: string

  gunNotu?: string
  updatedAt: string

  /** @deprecated kitapDk'ya taşındı; yalnızca eski kayıtları okumak için. */
  kitapSayfa?: number
}

/** Bir haftanın kaydı. Anahtar: weekStart (o haftanın Pazartesi'si). */
export interface WeekEntry {
  weekStart: string

  ozguven?: number // 1-10
  ozguvenNotu?: string

  /** Ölçüm hedefi id'si → o hafta girilen değer. Haftada TEK giriş, sonra kilitlenir. */
  olcumler?: Record<string, number>
  olcumTarihi?: string
  olcumKilitli?: boolean

  ozguvenIcinNeYaptim?: string
  haftaninKazanimi?: string
  enCokNeErteledim?: string
  gelecekHaftaOdagi?: string

  updatedAt: string

  /** @deprecated olcumler'e taşındı; yalnızca eski kayıtları okumak için. */
  bel?: number
  /** @deprecated olcumler'e taşındı. */
  kol?: number
  /** @deprecated olcumler'e taşındı. */
  kilo?: number
}

// ── Hedefler ────────────────────────────────────────────────────────────────

/** Kamp boyu sürecek ölçüm hedefi (bel, kol, kilo…). Haftalık girilir. */
export interface OlcumHedefi {
  id: string
  label: string
  baslangic: number
  /** null = hedef yok, yalnızca izlenir (örn. kilo). */
  hedef: number | null
  birim: string
}

/** Haftalık değerin nasıl hesaplanacağı. */
export type MikroTur = 'toplam' | 'ortalama' | 'gun'
/** Hedefin altına düşmemek mi, üstüne çıkmamak mı. */
export type MikroYon = 'enAz' | 'enFazla'

/** Haftalık somut hedef: "bu hafta 300 dk kitap oku" gibi. */
export interface MikroHedef {
  id: string
  metrikId: string
  hedef: number
  tur: MikroTur
  yon: MikroYon
  aktif: boolean
}

export interface Settings {
  kampBaslangic: string // YYYY-MM-DD
  kampGunSayisi: number
  gizliMetrikler: string[] // metrik id'leri — formda gizlenir
  tema: 'dark' | 'light'
  olcumHedefleri: OlcumHedefi[]
  mikroHedefler: MikroHedef[]
}

export interface Backup {
  /** Şema sürümü — geri yüklerken göçün çalışıp çalışmayacağını belirler. */
  surum: number
  disaAktarma: string
  days: DayEntry[]
  weeks: WeekEntry[]
  settings: Settings
}
