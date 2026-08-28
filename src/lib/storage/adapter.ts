// Depolama arayüzü. UI hiçbir zaman doğrudan localStorage görmez —
// böylece Faz 4'te SupabaseAdapter aynı arayüzü uygulayınca hiçbir ekran değişmez.
import type { Backup, DayEntry, Settings, WeekEntry } from '../types.ts'

export interface StorageAdapter {
  readonly ad: string
  gunleriGetir(): Promise<DayEntry[]>
  gunKaydet(kayit: DayEntry): Promise<void>
  haftalariGetir(): Promise<WeekEntry[]>
  haftaKaydet(kayit: WeekEntry): Promise<void>
  ayarlariGetir(): Promise<Settings>
  ayarlariKaydet(ayarlar: Settings): Promise<void>
  tumunuDisaAktar(): Promise<Backup>
  tumunuIceAktar(yedek: Backup): Promise<void>
  hepsiniSil(): Promise<void>
}

export const VARSAYILAN_AYARLAR: Settings = {
  // 31 Ağustos 2026 Pazartesi → 29 Kasım 2026 Pazar = 91 gün = 13 tam hafta
  kampBaslangic: '2026-08-31',
  kampGunSayisi: 91,
  gizliMetrikler: [],
  tema: 'dark',
  // Başlangıç hedefleri — Hedefler ekranından değiştirilebilir, silinebilir, yenisi eklenebilir.
  olcumHedefleri: [
    { id: 'bel', label: 'Bel', baslangic: 94, hedef: 88, birim: 'cm' },
    { id: 'kol', label: 'Kol', baslangic: 36, hedef: 39, birim: 'cm' },
    { id: 'kilo', label: 'Kilo', baslangic: 79.3, hedef: null, birim: 'kg' },
  ],
  mikroHedefler: [],
}
