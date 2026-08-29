// Supabase bağlantı bilgileri. Anahtarlar KODA GÖMÜLMEZ — depo herkese açık.
// Kullanıcı uygulama içinden girer, yalnızca kendi tarayıcısında saklanır.
const ANAHTAR = 'kamp90:supabase'

export interface BaglantiAyari {
  url: string
  anonKey: string
}

export function baglantiOku(): BaglantiAyari | null {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (!ham) return null
    const v = JSON.parse(ham) as Partial<BaglantiAyari>
    if (!v.url || !v.anonKey) return null
    return { url: v.url, anonKey: v.anonKey }
  } catch {
    return null
  }
}

export function baglantiYaz(ayar: BaglantiAyari | null): void {
  if (ayar === null) localStorage.removeItem(ANAHTAR)
  else localStorage.setItem(ANAHTAR, JSON.stringify(ayar))
}

/** Girilen değerlerin biçimini kabaca doğrular; yanlış yapıştırmayı erken yakalar. */
export function baglantiGecerliMi(url: string, anonKey: string): string | null {
  const u = url.trim()
  if (!u) return 'Proje URL’si boş.'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(u)) {
    return 'Proje URL’si https://xxxx.supabase.co biçiminde olmalı.'
  }
  const k = anonKey.trim()
  if (!k) return 'Anon anahtarı boş.'
  if (k.length < 40) return 'Anon anahtarı eksik görünüyor.'
  return null
}
