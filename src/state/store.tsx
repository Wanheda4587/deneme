import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Backup, DayEntry, Settings, WeekEntry } from '../lib/types.ts'
import { depo, VARSAYILAN_AYARLAR } from '../lib/storage/index.ts'
import { bugun } from '../lib/date.ts'

interface StoreCtx {
  hazir: boolean
  gunler: Map<string, DayEntry>
  haftalar: Map<string, WeekEntry>
  ayarlar: Settings
  kaydediliyor: boolean
  hata: string | null
  gunGuncelle: (date: string, yama: Partial<DayEntry>) => void
  haftaGuncelle: (weekStart: string, yama: Partial<WeekEntry>) => void
  ayarGuncelle: (yama: Partial<Settings>) => void
  disaAktar: () => Promise<Backup>
  iceAktar: (yedek: Backup) => Promise<void>
  hepsiniSil: () => Promise<void>
  topluYukle: (gunler: DayEntry[], haftalar: WeekEntry[]) => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

const YAZMA_GECIKMESI = 300

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hazir, setHazir] = useState(false)
  const [gunler, setGunler] = useState<Map<string, DayEntry>>(new Map())
  const [haftalar, setHaftalar] = useState<Map<string, WeekEntry>>(new Map())
  const [ayarlar, setAyarlar] = useState<Settings>(VARSAYILAN_AYARLAR)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  // Bekleyen yazmalar: aynı kayda arka arkaya yazılırsa tek yazmaya iner.
  const bekleyenGun = useRef<Map<string, DayEntry>>(new Map())
  const bekleyenHafta = useRef<Map<string, WeekEntry>>(new Map())
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let iptal = false
    ;(async () => {
      try {
        const d = depo()
        const [g, h, a] = await Promise.all([
          d.gunleriGetir(),
          d.haftalariGetir(),
          d.ayarlariGetir(),
        ])
        if (iptal) return
        setGunler(new Map(g.map((x) => [x.date, x])))
        setHaftalar(new Map(h.map((x) => [x.weekStart, x])))
        setAyarlar(a)
      } catch (e) {
        if (!iptal) setHata(e instanceof Error ? e.message : 'Veri okunamadı.')
      } finally {
        if (!iptal) setHazir(true)
      }
    })()
    return () => {
      iptal = true
    }
  }, [])

  const bekleyenleriYaz = useCallback(async () => {
    const d = depo()
    const gunYazmalari = [...bekleyenGun.current.values()]
    const haftaYazmalari = [...bekleyenHafta.current.values()]
    bekleyenGun.current.clear()
    bekleyenHafta.current.clear()
    if (gunYazmalari.length === 0 && haftaYazmalari.length === 0) return
    setKaydediliyor(true)
    try {
      for (const g of gunYazmalari) await d.gunKaydet(g)
      for (const h of haftaYazmalari) await d.haftaKaydet(h)
      setHata(null)
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }, [])

  const yazmayiPlanla = useCallback(() => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(() => {
      void bekleyenleriYaz()
    }, YAZMA_GECIKMESI)
  }, [bekleyenleriYaz])

  // Sekme kapanırken bekleyen yazma varsa kaybolmasın.
  useEffect(() => {
    const kapanirken = () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
      void bekleyenleriYaz()
    }
    window.addEventListener('pagehide', kapanirken)
    return () => {
      window.removeEventListener('pagehide', kapanirken)
      kapanirken()
    }
  }, [bekleyenleriYaz])

  const gunGuncelle = useCallback(
    (date: string, yama: Partial<DayEntry>) => {
      setGunler((onceki) => {
        const mevcut = onceki.get(date) ?? { date, updatedAt: '' }
        const yeni: DayEntry = { ...mevcut, ...yama, date, updatedAt: new Date().toISOString() }
        bekleyenGun.current.set(date, yeni)
        const harita = new Map(onceki)
        harita.set(date, yeni)
        return harita
      })
      yazmayiPlanla()
    },
    [yazmayiPlanla],
  )

  const haftaGuncelle = useCallback(
    (weekStart: string, yama: Partial<WeekEntry>) => {
      setHaftalar((onceki) => {
        const mevcut = onceki.get(weekStart) ?? { weekStart, updatedAt: '' }
        const yeni: WeekEntry = {
          ...mevcut,
          ...yama,
          weekStart,
          updatedAt: new Date().toISOString(),
        }
        bekleyenHafta.current.set(weekStart, yeni)
        const harita = new Map(onceki)
        harita.set(weekStart, yeni)
        return harita
      })
      yazmayiPlanla()
    },
    [yazmayiPlanla],
  )

  const ayarGuncelle = useCallback((yama: Partial<Settings>) => {
    setAyarlar((onceki) => {
      const yeni = { ...onceki, ...yama }
      void depo().ayarlariKaydet(yeni)
      return yeni
    })
  }, [])

  const disaAktar = useCallback(async () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current)
    await bekleyenleriYaz()
    return depo().tumunuDisaAktar()
  }, [bekleyenleriYaz])

  const iceAktar = useCallback(async (yedek: Backup) => {
    await depo().tumunuIceAktar(yedek)
    setGunler(new Map((yedek.days ?? []).map((x) => [x.date, x])))
    setHaftalar(new Map((yedek.weeks ?? []).map((x) => [x.weekStart, x])))
    setAyarlar({ ...VARSAYILAN_AYARLAR, ...(yedek.settings ?? {}) })
  }, [])

  const hepsiniSil = useCallback(async () => {
    await depo().hepsiniSil()
    setGunler(new Map())
    setHaftalar(new Map())
    setAyarlar({ ...VARSAYILAN_AYARLAR })
  }, [])

  const topluYukle = useCallback(
    async (yeniGunler: DayEntry[], yeniHaftalar: WeekEntry[]) => {
      const d = depo()
      for (const g of yeniGunler) await d.gunKaydet(g)
      for (const h of yeniHaftalar) await d.haftaKaydet(h)
      setGunler((onceki) => {
        const harita = new Map(onceki)
        for (const g of yeniGunler) harita.set(g.date, g)
        return harita
      })
      setHaftalar((onceki) => {
        const harita = new Map(onceki)
        for (const h of yeniHaftalar) harita.set(h.weekStart, h)
        return harita
      })
    },
    [],
  )

  // Tema kökteki data-theme'e yazılır; CSS oradan okur.
  useEffect(() => {
    document.documentElement.dataset.theme = ayarlar.tema
    document.documentElement.style.colorScheme = ayarlar.tema
  }, [ayarlar.tema])

  const deger = useMemo<StoreCtx>(
    () => ({
      hazir,
      gunler,
      haftalar,
      ayarlar,
      kaydediliyor,
      hata,
      gunGuncelle,
      haftaGuncelle,
      ayarGuncelle,
      disaAktar,
      iceAktar,
      hepsiniSil,
      topluYukle,
    }),
    [
      hazir, gunler, haftalar, ayarlar, kaydediliyor, hata,
      gunGuncelle, haftaGuncelle, ayarGuncelle, disaAktar, iceAktar, hepsiniSil, topluYukle,
    ],
  )

  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore, StoreProvider içinde kullanılmalı.')
  return c
}

/** Bugünün kaydı (yoksa boş iskelet). */
export function useBugun(): DayEntry {
  const { gunler } = useStore()
  const d = bugun()
  return gunler.get(d) ?? { date: d, updatedAt: '' }
}
