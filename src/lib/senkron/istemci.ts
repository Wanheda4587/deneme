// Supabase istemcisi. Kütüphane ağır olduğu için yalnızca senkron kullanılırken
// (tembel import) yüklenir; bağlantı kurmayan kullanıcı bu maliyeti ödemez.
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { baglantiOku } from './ayar.ts'

let istemciOnbellek: { url: string; client: SupabaseClient } | null = null

export async function istemci(): Promise<SupabaseClient | null> {
  const ayar = baglantiOku()
  if (!ayar) return null
  if (istemciOnbellek && istemciOnbellek.url === ayar.url) return istemciOnbellek.client

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(ayar.url, ayar.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  istemciOnbellek = { url: ayar.url, client }
  return client
}

/** Bağlantı ayarı değişince önbellekteki istemci geçersiz olur. */
export function istemciSifirla(): void {
  istemciOnbellek = null
}

export async function oturum(): Promise<Session | null> {
  const c = await istemci()
  if (!c) return null
  const { data } = await c.auth.getSession()
  return data.session
}

/** E-postaya altı haneli kod gönderir. */
export async function kodGonder(eposta: string): Promise<void> {
  const c = await istemci()
  if (!c) throw new Error('Önce Supabase bağlantısını gir.')
  const { error } = await c.auth.signInWithOtp({
    email: eposta.trim(),
    options: { shouldCreateUser: true },
  })
  if (error) throw new Error(cevir(error.message))
}

/** Gelen kodu doğrulayıp oturumu açar. */
export async function kodDogrula(eposta: string, kod: string): Promise<void> {
  const c = await istemci()
  if (!c) throw new Error('Önce Supabase bağlantısını gir.')
  const { error } = await c.auth.verifyOtp({
    email: eposta.trim(),
    token: kod.trim(),
    type: 'email',
  })
  if (error) throw new Error(cevir(error.message))
}

export async function cikisYap(): Promise<void> {
  const c = await istemci()
  await c?.auth.signOut()
}

/** Sık karşılaşılan Supabase hatalarını okunur Türkçeye çevirir. */
function cevir(mesaj: string): string {
  const m = mesaj.toLowerCase()
  if (m.includes('invalid') && m.includes('token')) return 'Kod yanlış veya süresi dolmuş.'
  if (m.includes('expired')) return 'Kodun süresi dolmuş, yeniden kod iste.'
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını ve proje URL’sini kontrol et.'
  }
  return mesaj
}
