// İki yönlü senkron.
//
// Yerel depo ana kaynaktır: uygulama her zaman yerelden okur ve yerele yazar,
// böylece internetsizken de tam çalışır. Senkron bunun üstüne biner.
//
// Çakışma kuralı kayıt bazında "daha yeni yazan kazanır" (updatedAt karşılaştırması).
// Kamp en fazla 91 gün olduğu için her senkronda tüm kayıtlar çekilip gönderilir;
// delta takibi yapılmaz — az veri, çok daha az hata yüzeyi.
import type { Backup, DayEntry, Settings, WeekEntry } from '../types.ts'
import { istemci } from './istemci.ts'

export interface SenkronSonucu {
  indirilen: number
  gonderilen: number
  zaman: string
}

/** Boş/eksik zaman damgalarını en eski sayar. */
export function zaman(v: string | undefined): string {
  return v && v.length > 0 ? v : '0000'
}

export function birlestir<T extends { updatedAt: string }>(
  yerel: T[],
  uzak: T[],
  anahtar: (x: T) => string,
): { sonuc: T[]; uzaktanGelen: number } {
  const harita = new Map<string, T>()
  for (const k of yerel) harita.set(anahtar(k), k)
  let uzaktanGelen = 0
  for (const u of uzak) {
    const id = anahtar(u)
    const mevcut = harita.get(id)
    if (!mevcut || zaman(u.updatedAt) > zaman(mevcut.updatedAt)) {
      harita.set(id, u)
      uzaktanGelen++
    }
  }
  return { sonuc: [...harita.values()], uzaktanGelen }
}

/**
 * Yerel yedeği uzak veriyle birleştirir ve birleşmiş hali her iki tarafa yazar.
 * Çağıran, dönen yedeği yerele uygulamakla yükümlüdür.
 */
export async function senkronEt(
  yerel: Backup,
): Promise<{ birlesik: Backup; sonuc: SenkronSonucu }> {
  const c = await istemci()
  if (!c) throw new Error('Supabase bağlantısı tanımlı değil.')

  const { data: oturumVerisi } = await c.auth.getSession()
  const kullanici = oturumVerisi.session?.user?.id
  if (!kullanici) throw new Error('Oturum açık değil. E-posta ile giriş yap.')

  // ── İndir ──
  const [gunSorgu, haftaSorgu, ayarSorgu] = await Promise.all([
    c.from('gunler').select('tarih, veri').eq('kullanici', kullanici),
    c.from('haftalar').select('hafta_basi, veri').eq('kullanici', kullanici),
    c.from('ayarlar').select('veri').eq('kullanici', kullanici).maybeSingle(),
  ])
  for (const s of [gunSorgu, haftaSorgu, ayarSorgu]) {
    if (s.error) throw new Error(tabloHatasi(s.error.message))
  }

  const uzakGunler = (gunSorgu.data ?? []).map((r) => r.veri as DayEntry)
  const uzakHaftalar = (haftaSorgu.data ?? []).map((r) => r.veri as WeekEntry)
  const uzakAyarlar = (ayarSorgu.data?.veri ?? null) as Settings | null

  // ── Birleştir ──
  const gunler = birlestir(yerel.days, uzakGunler, (g) => g.date)
  const haftalar = birlestir(yerel.weeks, uzakHaftalar, (h) => h.weekStart)
  const ayarlarUzakYeni =
    uzakAyarlar !== null && zaman(uzakAyarlar.guncellendi) > zaman(yerel.settings.guncellendi)
  const ayarlar = ayarlarUzakYeni ? uzakAyarlar : yerel.settings

  const birlesik: Backup = {
    surum: yerel.surum,
    disaAktarma: new Date().toISOString(),
    days: gunler.sonuc.sort((a, b) => a.date.localeCompare(b.date)),
    weeks: haftalar.sonuc.sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    settings: ayarlar,
  }

  // ── Gönder ──
  const gunSatirlari = birlesik.days.map((g) => ({
    kullanici, tarih: g.date, veri: g, guncellendi: zaman(g.updatedAt),
  }))
  const haftaSatirlari = birlesik.weeks.map((h) => ({
    kullanici, hafta_basi: h.weekStart, veri: h, guncellendi: zaman(h.updatedAt),
  }))

  const yazmalar = []
  if (gunSatirlari.length > 0) {
    yazmalar.push(c.from('gunler').upsert(gunSatirlari, { onConflict: 'kullanici,tarih' }))
  }
  if (haftaSatirlari.length > 0) {
    yazmalar.push(
      c.from('haftalar').upsert(haftaSatirlari, { onConflict: 'kullanici,hafta_basi' }),
    )
  }
  yazmalar.push(
    c.from('ayarlar').upsert(
      { kullanici, veri: birlesik.settings, guncellendi: zaman(birlesik.settings.guncellendi) },
      { onConflict: 'kullanici' },
    ),
  )

  for (const y of await Promise.all(yazmalar)) {
    if (y.error) throw new Error(tabloHatasi(y.error.message))
  }

  return {
    birlesik,
    sonuc: {
      indirilen: gunler.uzaktanGelen + haftalar.uzaktanGelen + (ayarlarUzakYeni ? 1 : 0),
      gonderilen: gunSatirlari.length + haftaSatirlari.length + 1,
      zaman: new Date().toISOString(),
    },
  }
}

/** Buluttaki tüm kayıtları siler. Yerel silme ile birlikte çağrılır. */
export async function uzaktakiniSil(): Promise<void> {
  const c = await istemci()
  if (!c) return
  const { data } = await c.auth.getSession()
  const kullanici = data.session?.user?.id
  if (!kullanici) return
  await Promise.all([
    c.from('gunler').delete().eq('kullanici', kullanici),
    c.from('haftalar').delete().eq('kullanici', kullanici),
    c.from('ayarlar').delete().eq('kullanici', kullanici),
  ])
}

function tabloHatasi(mesaj: string): string {
  const m = mesaj.toLowerCase()
  if (m.includes('does not exist') || m.includes('schema cache')) {
    return 'Tablolar bulunamadı. Kurulum SQL’ini Supabase SQL Editor’de çalıştırdın mı?'
  }
  if (m.includes('row-level security') || m.includes('policy')) {
    return 'Yetki reddedildi. Kurulum SQL’indeki güvenlik kuralları eksik olabilir.'
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'
  }
  return mesaj
}
