// ─────────────────────────────────────────────────────────────────────────────
// METRİK KAYIT DEFTERİ — tek doğruluk kaynağı.
// Günlük form alanları, trend grafikleri ve haftalık karşılaştırma tablosu
// hep bu listeden üretilir. Yeni metrik eklemek = buraya bir satır.
// ─────────────────────────────────────────────────────────────────────────────
import type { DayEntry, Pillar } from './types.ts'

export type MetricType = 'bool' | 'scale' | 'percent' | 'number' | 'sure'
export type Yon = 'yuksek' | 'dusuk' | 'yok'

/** DayEntry'nin sayısal/boolean (yani grafiklenebilir) alanları. */
export type MetrikId = Exclude<
  keyof DayEntry,
  'date' | 'updatedAt' | 'antrenmanNotu' | 'gelirNotu' | 'gunNotu' | 'kitapSayfa'
>

export interface MetricDef {
  id: MetrikId
  label: string
  /** Grafik başlığı / dar ekran için kısa ad. */
  kisa: string
  pillar: Pillar
  type: MetricType
  min?: number
  max?: number
  step?: number
  birim?: string
  /** Trend okunun hangi yönü "iyi" sayacağı. */
  yon: Yon
  ipucu?: string
  /** Sadece "antrenmana gittim" işaretliyken göster. */
  antrenmanaBagli?: boolean
}

export const METRIKLER: MetricDef[] = [
  // — Vücut —
  { id: 'antrenman', label: 'Antrenmana gittim mi?', kisa: 'Antrenman', pillar: 'vucut', type: 'bool', yon: 'yuksek' },
  { id: 'antrenmanVerimi', label: 'Antrenman verimi', kisa: 'Antr. verimi', pillar: 'vucut', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek', antrenmanaBagli: true },
  { id: 'kardiyoDk', label: 'Kardiyo', kisa: 'Kardiyo', pillar: 'vucut', type: 'number', min: 0, max: 300, step: 5, birim: 'dk', yon: 'yuksek' },

  // — Enerji & Keyif —
  { id: 'uykuSaati', label: 'Uyku süresi', kisa: 'Uyku', pillar: 'enerji', type: 'sure', min: 0, max: 14, birim: 'sa', yon: 'yuksek' },
  { id: 'uykuKalitesi', label: 'Uyku kalitesi', kisa: 'Uyku kalitesi', pillar: 'enerji', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek' },
  { id: 'enerji', label: 'Enerji', kisa: 'Enerji', pillar: 'enerji', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek' },
  { id: 'mutluluk', label: 'Mutluluk', kisa: 'Mutluluk', pillar: 'enerji', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek' },
  { id: 'beslenme', label: 'Beslenme', kisa: 'Beslenme', pillar: 'enerji', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek' },
  { id: 'kaloriDengesi', label: 'Kalori dengesi', kisa: 'Kalori', pillar: 'enerji', type: 'number', min: -2000, max: 2000, step: 50, birim: 'kcal', yon: 'yok', ipucu: 'Eksi = açık verdim, artı = fazla aldım' },
  { id: 'isSaati', label: 'İş yerinde çalışma', kisa: 'İş saati', pillar: 'enerji', type: 'sure', min: 0, max: 16, birim: 'sa', yon: 'yok' },

  // — Disiplin —
  { id: 'disiplin', label: 'Disiplin puanı', kisa: 'Disiplin', pillar: 'disiplin', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek', ipucu: 'Düşük puan = bugün çok erteledim' },

  // — Özgüven & İletişim —
  { id: 'sahneDk', label: 'Sahne programı çalışması', kisa: 'Sahne', pillar: 'ozguven', type: 'number', min: 0, max: 600, step: 5, birim: 'dk', yon: 'yuksek' },
  { id: 'kitapDk', label: 'Kitap okuma', kisa: 'Kitap', pillar: 'ozguven', type: 'number', min: 0, max: 600, step: 5, birim: 'dk', yon: 'yuksek' },

  // — Ek Gelir —
  { id: 'gelirDk', label: 'Ayırdığım süre', kisa: 'Gelir süresi', pillar: 'gelir', type: 'number', min: 0, max: 900, step: 5, birim: 'dk', yon: 'yuksek' },
  { id: 'gelirVerimi', label: 'Verim', kisa: 'Gelir verimi', pillar: 'gelir', type: 'percent', min: 0, max: 100, step: 0.5, birim: '%', yon: 'yuksek' },
]

export const METRIK_HARITASI: Record<string, MetricDef> = Object.fromEntries(
  METRIKLER.map((m) => [m.id, m]),
)

export function metrik(id: MetrikId): MetricDef {
  return METRIK_HARITASI[id]
}

// ─────────────────────────────────────────────────────────────────────────────
// SÜTUNLAR
// Renkler doğrulanmış kategorik paletten, sabit sırayla (slot 1-5).
// `node scripts/validate_palette.js` ile iki modda da geçtiği doğrulandı.
// ─────────────────────────────────────────────────────────────────────────────
export interface PillarDef {
  id: Pillar
  label: string
  ikon: string
  /** Açık tema hex'i. */
  renk: string
  /** Koyu tema hex'i — otomatik çevrim değil, koyu zemin için ayrıca seçilmiş adım. */
  renkKoyu: string
}

export const SUTUNLAR: PillarDef[] = [
  { id: 'vucut', label: 'Vücut', ikon: '🏋️', renk: '#2a78d6', renkKoyu: '#3987e5' },
  { id: 'enerji', label: 'Enerji & Keyif', ikon: '⚡', renk: '#eb6834', renkKoyu: '#d95926' },
  { id: 'disiplin', label: 'Disiplin', ikon: '🎯', renk: '#1baf7a', renkKoyu: '#199e70' },
  { id: 'ozguven', label: 'Özgüven & İletişim', ikon: '🎤', renk: '#eda100', renkKoyu: '#c98500' },
  { id: 'gelir', label: 'Ek Gelir', ikon: '💰', renk: '#e87ba4', renkKoyu: '#d55181' },
]

export const SUTUN_HARITASI: Record<Pillar, PillarDef> = Object.fromEntries(
  SUTUNLAR.map((s) => [s.id, s]),
) as Record<Pillar, PillarDef>

export function sutununMetrikleri(p: Pillar): MetricDef[] {
  return METRIKLER.filter((m) => m.pillar === p)
}

// ─────────────────────────────────────────────────────────────────────────────
// GÜNLÜK FORMDAKİ SERBEST METİN ALANLARI
// ─────────────────────────────────────────────────────────────────────────────
export type MetinAlanId = 'antrenmanNotu' | 'gelirNotu' | 'gunNotu'

export interface MetinAlanDef {
  id: MetinAlanId
  pillar: Pillar
  label: string
  /** Antrenmana gitmediğinde kullanılan alternatif etiket. */
  labelAlt?: string
  placeholder: string
  placeholderAlt?: string
  satir: number
}

export const METIN_ALANLARI: MetinAlanDef[] = [
  {
    id: 'antrenmanNotu',
    pillar: 'vucut',
    label: 'Antrenman notu',
    labelAlt: 'Neden gitmedim?',
    placeholder: 'Ne çalıştım, nasıl geçti?',
    placeholderAlt: 'Bugün neden gidemedim?',
    satir: 2,
  },
  { id: 'gelirNotu', pillar: 'gelir', label: 'Ne yaptım?', placeholder: 'Bugün ek gelir için ne üzerinde çalıştım?', satir: 2 },
  { id: 'gunNotu', pillar: 'gelir', label: 'Gün notu', placeholder: 'Bugün nasıl geçti?', satir: 3 },
]
