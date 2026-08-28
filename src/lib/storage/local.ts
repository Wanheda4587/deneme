// Faz 1 deposu: her şey tarayıcının localStorage'ında tek bir JSON içinde.
// Veri yalnızca bu cihazda kalır; repoya veya bir sunucuya gitmez.
import type { Backup, DayEntry, Settings, WeekEntry } from '../types.ts'
import type { StorageAdapter } from './adapter.ts'
import { VARSAYILAN_AYARLAR } from './adapter.ts'

const ANAHTAR = 'kamp90:v1'

/** Şema sürümü. Göçlerin bir kez çalışmasını sağlar. */
const SEMA_SURUMU = 2

interface Depo {
  surum?: number
  days: Record<string, DayEntry>
  weeks: Record<string, WeekEntry>
  settings: Settings
}

function bosDepo(): Depo {
  return { surum: SEMA_SURUMU, days: {}, weeks: {}, settings: { ...VARSAYILAN_AYARLAR } }
}

/**
 * Eski kayıtları güncel şemaya taşır. Yıkıcı değildir: eski alanlar silinmez,
 * yalnızca yeni alanlar doldurulur; böylece bir sürüm geri alınsa veri durur.
 * Bir şey değiştiyse true döner, çağıran sonucu diske geri yazar.
 */
function goc(depo: Depo): boolean {
  let degisti = false
  const surum = depo.surum ?? 1

  // Sürüm 2: uyku kalitesi, enerji, mutluluk ve beslenme 1-10 ölçeğinden
  // yüzdeye geçti. Eski değerler on ile çarpılır (7/10 → %70). Sürüm damgası
  // sayesinde bu dönüşüm yalnızca bir kez uygulanır.
  if (surum < 2) {
    const YUZDEYE = ['uykuKalitesi', 'enerji', 'mutluluk', 'beslenme'] as const
    for (const gun of Object.values(depo.days)) {
      for (const alan of YUZDEYE) {
        const v = gun[alan]
        if (typeof v === 'number' && Number.isFinite(v) && v <= 10) {
          gun[alan] = Math.round(v * 10 * 10) / 10
          degisti = true
        }
      }
    }
    depo.surum = SEMA_SURUMU
    degisti = true
  }

  for (const gun of Object.values(depo.days)) {
    // Kitap takibi sayfadan dakikaya geçti. Sayı birebir taşınır (yaklaşık
    // 1 sayfa ≈ 1 dakika); yanlışsa kullanıcı ilgili günden düzeltebilir.
    if (gun.kitapDk === undefined && typeof gun.kitapSayfa === 'number') {
      gun.kitapDk = gun.kitapSayfa
      degisti = true
    }
  }

  for (const hafta of Object.values(depo.weeks)) {
    if (hafta.olcumler === undefined) {
      const olcumler: Record<string, number> = {}
      // Sabit bel/kol/kilo alanları, hedef id'sine göre haritaya taşındı.
      for (const alan of ['bel', 'kol', 'kilo'] as const) {
        const v = hafta[alan]
        if (typeof v === 'number' && Number.isFinite(v)) olcumler[alan] = v
      }
      if (Object.keys(olcumler).length > 0) {
        hafta.olcumler = olcumler
        degisti = true
      }
    }
  }

  return degisti
}

function oku(): Depo {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (!ham) return bosDepo()
    const veri = JSON.parse(ham) as Partial<Depo>
    const depo: Depo = {
      surum: veri.surum,
      days: veri.days ?? {},
      weeks: veri.weeks ?? {},
      settings: { ...VARSAYILAN_AYARLAR, ...(veri.settings ?? {}) },
    }
    // Göç bir kez yapılıp kalıcılaşsın; her okumada tekrarlanmasın.
    if (goc(depo)) {
      try {
        yaz(depo)
      } catch {
        // Yazamasak da okunan veri güncel şemada; uygulama çalışmaya devam eder.
      }
    }
    return depo
  } catch {
    // Bozuk/erişilemez depo uygulamayı kilitlemesin.
    return bosDepo()
  }
}

function yaz(depo: Depo): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(depo))
  } catch (e) {
    console.error('Kaydedilemedi — tarayıcı depolaması dolu veya kapalı olabilir.', e)
    throw new Error('Veri kaydedilemedi. Tarayıcı depolaması dolu veya engellenmiş olabilir.')
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly ad = 'Bu cihaz (tarayıcı)'

  async gunleriGetir(): Promise<DayEntry[]> {
    return Object.values(oku().days).sort((a, b) => a.date.localeCompare(b.date))
  }

  async gunKaydet(kayit: DayEntry): Promise<void> {
    const depo = oku()
    depo.days[kayit.date] = kayit
    yaz(depo)
  }

  async haftalariGetir(): Promise<WeekEntry[]> {
    return Object.values(oku().weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  }

  async haftaKaydet(kayit: WeekEntry): Promise<void> {
    const depo = oku()
    depo.weeks[kayit.weekStart] = kayit
    yaz(depo)
  }

  async ayarlariGetir(): Promise<Settings> {
    return oku().settings
  }

  async ayarlariKaydet(ayarlar: Settings): Promise<void> {
    const depo = oku()
    depo.settings = ayarlar
    yaz(depo)
  }

  async tumunuDisaAktar(): Promise<Backup> {
    const depo = oku()
    return {
      surum: depo.surum ?? SEMA_SURUMU,
      disaAktarma: new Date().toISOString(),
      days: Object.values(depo.days).sort((a, b) => a.date.localeCompare(b.date)),
      weeks: Object.values(depo.weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      settings: depo.settings,
    }
  }

  async tumunuIceAktar(yedek: Backup): Promise<void> {
    const depo: Depo = {
      surum: yedek.surum,
      days: Object.fromEntries((yedek.days ?? []).map((g) => [g.date, g])),
      weeks: Object.fromEntries((yedek.weeks ?? []).map((h) => [h.weekStart, h])),
      settings: { ...VARSAYILAN_AYARLAR, ...(yedek.settings ?? {}) },
    }
    goc(depo)
    yaz(depo)
  }

  async hepsiniSil(): Promise<void> {
    yaz(bosDepo())
  }
}
