import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { IlerlemeCubugu, Kart } from '../components/ui/Kart.tsx'
import { OLCUM_HEDEFLERI } from '../lib/types.ts'
import type { OlcumHedefi } from '../lib/types.ts'
import { bugun as bugunIso, gunFarki, kampHaftalari, kisaTarih, uzunTarih } from '../lib/date.ts'
import { hedefDurumu } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'
import { useTemaRenkleri } from '../state/tema.ts'

interface Nokta {
  hafta: string
  gercek: number | null
  hedefCizgisi: number
}

export function Hedefler() {
  const { haftalar, ayarlar } = useStore()
  const renk = useTemaRenkleri()
  const { kampBaslangic, kampGunSayisi } = ayarlar

  const gecenGun = Math.min(Math.max(gunFarki(kampBaslangic, bugunIso()) + 1, 0), kampGunSayisi)
  const haftaListesi = kampHaftalari(kampBaslangic, kampGunSayisi)

  return (
    <div className="flex flex-col gap-4">
      <div className="kart p-4">
        <div className="text-sm font-semibold">
          Kampın <span className="rakam">{Math.max(gecenGun, 0)}</span>. günü ·{' '}
          <span className="rakam">{Math.max(kampGunSayisi - gecenGun, 0)}</span> gün kaldı
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
          Ölçüm hedefleri haftalık girilen bel ve kol değerlerinden okunur. Kilo bilinçli olarak
          hedefsiz — bel düşerken kol büyürse kilo sabit kalabilir, bu başarıdır.
        </p>
      </div>

      {OLCUM_HEDEFLERI.map((hedef) => (
        <HedefKarti
          key={hedef.id}
          hedef={hedef}
          haftaListesi={haftaListesi}
          gecenGun={gecenGun}
          kampGunSayisi={kampGunSayisi}
          haftalar={haftalar}
          renk={renk}
        />
      ))}
    </div>
  )
}

function HedefKarti({
  hedef,
  haftaListesi,
  gecenGun,
  kampGunSayisi,
  haftalar,
  renk,
}: {
  hedef: OlcumHedefi
  haftaListesi: string[]
  gecenGun: number
  kampGunSayisi: number
  haftalar: Map<string, { bel?: number; kol?: number }>
  renk: ReturnType<typeof useTemaRenkleri>
}) {
  const cizgiRengi = renk.sutun.vucut

  const veri: Nokta[] = haftaListesi.map((hb, i) => {
    const oran = haftaListesi.length > 1 ? i / (haftaListesi.length - 1) : 0
    const kayit = haftalar.get(hb)
    return {
      hafta: hb,
      gercek: (kayit?.[hedef.id] as number | undefined) ?? null,
      hedefCizgisi: hedef.baslangic + (hedef.hedef - hedef.baslangic) * oran,
    }
  })

  const sonGercek = [...veri].reverse().find((n) => n.gercek !== null)?.gercek ?? null
  const durum = hedefDurumu(hedef.baslangic, hedef.hedef, sonGercek, gecenGun, kampGunSayisi)

  // Mevcut tempoyla kamp sonunda nerede olunacağı
  const projeksiyon =
    sonGercek !== null && gecenGun > 0
      ? hedef.baslangic + ((sonGercek - hedef.baslangic) / gecenGun) * kampGunSayisi
      : null

  const artiMi = hedef.hedef > hedef.baslangic
  const bic = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} ${hedef.birim}`)

  // Y ekseni: eşit aralıklı tam sayılar (otomatik tikler 96/92/89/86 gibi düzensiz çıkıyordu)
  const adim = 2
  const eksenAlt = Math.floor((Math.min(hedef.baslangic, hedef.hedef) - 2) / adim) * adim
  const eksenUst = Math.ceil((Math.max(hedef.baslangic, hedef.hedef) + 2) / adim) * adim
  const eksenTikleri = Array.from(
    { length: Math.round((eksenUst - eksenAlt) / adim) + 1 },
    (_, i) => eksenAlt + i * adim,
  )

  return (
    <Kart
      baslik={`${hedef.label}: ${hedef.baslangic} → ${hedef.hedef} ${hedef.birim}`}
      ikon="📏"
      pillar="vucut"
      sag={
        durum.onde === null ? undefined : (
          <span className={`rozet ${durum.onde ? 'rozet-iyi' : 'rozet-uyari'}`}>
            <span aria-hidden="true">{durum.onde ? '✓' : '!'}</span>
            {durum.onde ? 'tempoda' : 'geride'}
          </span>
        )
      }
    >
      <div className="alan grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Şu an</div>
          <div className="rakam font-semibold text-lg">{bic(sonGercek)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Bugün olmalı</div>
          <div className="rakam font-semibold text-lg">{bic(durum.beklenen)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Hedef</div>
          <div className="rakam font-semibold text-lg">{hedef.hedef} {hedef.birim}</div>
        </div>
      </div>

      <div className="alan">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--c-ink-2)' }}>Kat edilen yol</span>
          <span className="rakam text-sm font-semibold">
            {durum.ilerleme === null ? '—' : `%${Math.max(0, Math.round(durum.ilerleme))}`}
          </span>
        </div>
        <IlerlemeCubugu
          oran={(durum.ilerleme ?? 0) / 100}
          renk={cizgiRengi}
          etiket={`${hedef.label} hedefine ilerleme`}
        />
        {projeksiyon !== null && (
          <p className="ipucu">
            Bu tempoyla {kampGunSayisi}. günde yaklaşık <strong className="rakam">
              {projeksiyon.toFixed(1)} {hedef.birim}
            </strong> olursun
            {' '}({artiMi
              ? projeksiyon >= hedef.hedef ? 'hedefin üstü' : 'hedefin altı'
              : projeksiyon <= hedef.hedef ? 'hedefin altı' : 'hedefin üstü'}).
          </p>
        )}
      </div>

      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={veri} margin={{ top: 8, right: 18, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={renk.izgara} vertical={false} />
            <XAxis
              dataKey="hafta" tickFormatter={kisaTarih}
              tick={{ fill: renk.ink3, fontSize: 11 }} interval={1}
              axisLine={{ stroke: renk.izgara }} tickLine={false}
            />
            <YAxis
              tick={{ fill: renk.ink3, fontSize: 11 }} axisLine={false} tickLine={false} width={44}
              domain={[eksenAlt, eksenUst]}
              ticks={eksenTikleri}
            />
            <Tooltip
              cursor={{ stroke: renk.ink3, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const n = payload[0].payload as Nokta
                return (
                  <div
                    className="rounded-lg px-3 py-2 text-xs shadow-lg"
                    style={{ background: 'var(--c-card)', border: '1px solid var(--c-cizgi)' }}
                  >
                    <div style={{ color: 'var(--c-ink-3)' }}>{uzunTarih(n.hafta)} haftası</div>
                    <div className="rakam font-semibold">Ölçüm: {bic(n.gercek)}</div>
                    <div className="rakam" style={{ color: 'var(--c-ink-3)' }}>
                      Hedef çizgisi: {n.hedefCizgisi.toFixed(1)} {hedef.birim}
                    </div>
                  </div>
                )
              }}
            />
            {/* Hedef çizgisi: kesikli referans */}
            <Line
              type="linear" dataKey="hedefCizgisi" name="Hedef çizgisi"
              stroke={renk.ink3} strokeWidth={1.5} strokeDasharray="5 4"
              dot={false} isAnimationActive={false}
            />
            {/* Gerçek ölçüm */}
            <Line
              type="monotone" dataKey="gercek" name="Ölçümün"
              stroke={cizgiRengi} strokeWidth={2}
              dot={{ r: 4, fill: cizgiRengi, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: cizgiRengi, stroke: renk.kart, strokeWidth: 2 }}
              connectNulls isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 px-3 pt-1 text-xs" style={{ color: 'var(--c-ink-3)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ width: 14, height: 2, background: cizgiRengi, borderRadius: 1 }} />
            Ölçümün
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" style={{ width: 14, height: 0, borderTop: `2px dashed ${renk.ink3}` }} />
            Hedef çizgisi
          </span>
        </div>
      </div>
    </Kart>
  )
}
