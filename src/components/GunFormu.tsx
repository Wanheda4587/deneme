import type { DayEntry, Pillar } from '../lib/types.ts'
import {
  METIN_ALANLARI,
  SUTUNLAR,
  sutununMetrikleri,
} from '../lib/metrics.ts'
import type { MetricDef, MetrikId } from '../lib/metrics.ts'
import { useStore } from '../state/store.tsx'
import { Alan, Kart } from './ui/Kart.tsx'
import { MetinAlani, MetrikAlani } from './ui/Girdiler.tsx'

/**
 * Bir günün tüm giriş alanları. Bölümler ve alanlar METRİKLER kayıt defterinden
 * üretilir — buraya elle alan eklenmez.
 */
export function GunFormu({ date }: { date: string }) {
  const { gunler, ayarlar, gunGuncelle } = useStore()
  const kayit: DayEntry = gunler.get(date) ?? { date, updatedAt: '' }

  const gizli = new Set(ayarlar.gizliMetrikler)
  const antrenmanaGitti = kayit.antrenman === true

  const metinAlani = (id: (typeof METIN_ALANLARI)[number]['id']) =>
    METIN_ALANLARI.find((a) => a.id === id)!

  const sutunGoster = (p: Pillar) => {
    const metrikler = sutununMetrikleri(p).filter((m) => !gizli.has(m.id))
    // "Antrenman verimi" yalnızca antrenmana gidildiyse sorulur.
    return metrikler.filter((m) => !m.antrenmanaBagli || antrenmanaGitti)
  }

  return (
    <div className="flex flex-col gap-4">
      {SUTUNLAR.map((sutun) => {
        const metrikler = sutunGoster(sutun.id)
        const notAlani =
          sutun.id === 'vucut'
            ? metinAlani('antrenmanNotu')
            : sutun.id === 'gelir'
              ? metinAlani('gelirNotu')
              : null
        // Antrenman notu ancak evet/hayır cevaplandıktan sonra anlamlı.
        const notGoster = notAlani && (sutun.id !== 'vucut' || kayit.antrenman !== undefined)
        if (metrikler.length === 0 && !notGoster) return null

        const antrenmanNotuEtiketi = antrenmanaGitti
          ? metinAlani('antrenmanNotu').label
          : metinAlani('antrenmanNotu').labelAlt!
        const antrenmanNotuIpucu = antrenmanaGitti
          ? metinAlani('antrenmanNotu').placeholder
          : metinAlani('antrenmanNotu').placeholderAlt!

        return (
          <Kart key={sutun.id} baslik={sutun.label} ikon={sutun.ikon} pillar={sutun.id}>
            {metrikler.map((def) => (
              <MetrikAlani
                key={def.id}
                def={def}
                deger={kayit[def.id] as number | boolean | undefined}
                onChange={(v) => {
                  const yama: Partial<DayEntry> = { [def.id]: v } as Partial<DayEntry>
                  // Antrenmana gitmedi işaretlenince verim değeri anlamını yitirir.
                  if (def.id === 'antrenman' && v !== true) yama.antrenmanVerimi = undefined
                  gunGuncelle(date, yama)
                }}
              />
            ))}

            {notGoster && notAlani && (
              <Alan
                etiket={notAlani.id === 'antrenmanNotu' ? antrenmanNotuEtiketi : notAlani.label}
              >
                <MetinAlani
                  deger={kayit[notAlani.id]}
                  onChange={(v) => gunGuncelle(date, { [notAlani.id]: v } as Partial<DayEntry>)}
                  placeholder={
                    notAlani.id === 'antrenmanNotu' ? antrenmanNotuIpucu : notAlani.placeholder
                  }
                  satir={notAlani.satir}
                  etiketi={notAlani.label}
                />
              </Alan>
            )}
          </Kart>
        )
      })}

      <Kart baslik="Gün notu" ikon="📝">
        <Alan etiket="Bugün nasıl geçti?">
          <MetinAlani
            deger={kayit.gunNotu}
            onChange={(v) => gunGuncelle(date, { gunNotu: v })}
            placeholder={metinAlani('gunNotu').placeholder}
            satir={4}
            etiketi="Gün notu"
          />
        </Alan>
      </Kart>
    </div>
  )
}

/**
 * O gün için sorulması anlamlı olan metrikler.
 * Antrenmana gidilmediyse "antrenman verimi" sorulmaz; dolayısıyla eksik de sayılmaz —
 * yoksa toplam alan sayısına asla ulaşılamazdı.
 */
export function gecerliMetrikler(
  kayit: DayEntry | undefined,
  gizli: Set<string>,
): MetricDef[] {
  const antrenmanaGitti = kayit?.antrenman === true
  return SUTUNLAR.flatMap((s) => sutununMetrikleri(s.id))
    .filter((m) => !gizli.has(m.id))
    .filter((m) => !m.antrenmanaBagli || antrenmanaGitti)
}

/** O gün için henüz doldurulmamış metrikler. */
export function eksikMetrikler(
  kayit: DayEntry | undefined,
  gizli: Set<string>,
): MetricDef[] {
  return gecerliMetrikler(kayit, gizli).filter((m) => {
    const v = kayit?.[m.id as MetrikId]
    return v === undefined || v === null
  })
}

/** Bir günde doldurulmuş metrik sayısı — "bugün ne kadarını girdim" göstergesi. */
export function doluAlanSayisi(kayit: DayEntry | undefined, gizli: Set<string>): number {
  return gecerliMetrikler(kayit, gizli).length - eksikMetrikler(kayit, gizli).length
}
