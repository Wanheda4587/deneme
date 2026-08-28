// Faz 1 deposu: her şey tarayıcının localStorage'ında tek bir JSON içinde.
// Veri yalnızca bu cihazda kalır; repoya veya bir sunucuya gitmez.
import type { Backup, DayEntry, Settings, WeekEntry } from '../types.ts'
import type { StorageAdapter } from './adapter.ts'
import { VARSAYILAN_AYARLAR } from './adapter.ts'

const ANAHTAR = 'kamp90:v1'

interface Depo {
  days: Record<string, DayEntry>
  weeks: Record<string, WeekEntry>
  settings: Settings
}

function bosDepo(): Depo {
  return { days: {}, weeks: {}, settings: { ...VARSAYILAN_AYARLAR } }
}

function oku(): Depo {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (!ham) return bosDepo()
    const veri = JSON.parse(ham) as Partial<Depo>
    return {
      days: veri.days ?? {},
      weeks: veri.weeks ?? {},
      settings: { ...VARSAYILAN_AYARLAR, ...(veri.settings ?? {}) },
    }
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
      surum: 1,
      disaAktarma: new Date().toISOString(),
      days: Object.values(depo.days).sort((a, b) => a.date.localeCompare(b.date)),
      weeks: Object.values(depo.weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      settings: depo.settings,
    }
  }

  async tumunuIceAktar(yedek: Backup): Promise<void> {
    const depo: Depo = {
      days: Object.fromEntries((yedek.days ?? []).map((g) => [g.date, g])),
      weeks: Object.fromEntries((yedek.weeks ?? []).map((h) => [h.weekStart, h])),
      settings: { ...VARSAYILAN_AYARLAR, ...(yedek.settings ?? {}) },
    }
    yaz(depo)
  }

  async hepsiniSil(): Promise<void> {
    yaz(bosDepo())
  }
}
