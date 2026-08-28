import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alan, IlerlemeCubugu, Kart } from '../components/ui/Kart.tsx'
import { Sayi } from '../components/ui/Girdiler.tsx'
import type { OlcumHedefi, WeekEntry } from '../lib/types.ts'
import { yeniId } from '../lib/kimlik.ts'
import { bugun as bugunIso, gunFarki, kampHaftalari, kisaTarih, uzunTarih } from '../lib/date.ts'
import { hedefDurumu } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'
import { useTemaRenkleri } from '../state/tema.ts'

export function Hedefler() {
  const { haftalar, ayarlar, ayarGuncelle } = useStore()
  const renk = useTemaRenkleri()
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null)
  const [silinecek, setSilinecek] = useState<string | null>(null)

  const { kampBaslangic, kampGunSayisi, olcumHedefleri } = ayarlar
  const gecenGun = Math.min(Math.max(gunFarki(kampBaslangic, bugunIso()) + 1, 0), kampGunSayisi)
  const haftaListesi = kampHaftalari(kampBaslangic, kampGunSayisi)

  const hedefYaz = (id: string, yama: Partial<OlcumHedefi>) =>
    ayarGuncelle({
      olcumHedefleri: olcumHedefleri.map((h) => (h.id === id ? { ...h, ...yama } : h)),
    })

  const hedefSil = (id: string) => {
    ayarGuncelle({ olcumHedefleri: olcumHedefleri.filter((h) => h.id !== id) })
    setSilinecek(null)
    setDuzenlenen(null)
  }

  const hedefEkle = () => {
    const id = yeniId('olcum')
    ayarGuncelle({
      olcumHedefleri: [
        ...olcumHedefleri,
        { id, label: 'Yeni ölçüm', baslangic: 0, hedef: null, birim: 'cm' },
      ],
    })
    setDuzenlenen(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="kart p-4">
        <div className="text-sm font-semibold">
          Kampın <span className="rakam">{Math.max(gecenGun, 0)}</span>. günü ·{' '}
          <span className="rakam">{Math.max(kampGunSayisi - gecenGun, 0)}</span> gün kaldı
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
          Bu ekrandaki hedefler kamp boyu sürer ve haftalık ölçümlerden okunur. Haftalık somut
          hedefler için <strong>Mikro Hedefler</strong> ekranına bak.
        </p>
      </div>

      {olcumHedefleri.map((hedef) => (
        <HedefKarti
          key={hedef.id}
          hedef={hedef}
          haftaListesi={haftaListesi}
          gecenGun={gecenGun}
          kampGunSayisi={kampGunSayisi}
          haftalar={haftalar}
          renk={renk}
          duzenleniyor={duzenlenen === hedef.id}
          silmeOnayi={silinecek === hedef.id}
          onDuzenle={() => setDuzenlenen(duzenlenen === hedef.id ? null : hedef.id)}
          onDegistir={(yama) => hedefYaz(hedef.id, yama)}
          onSilIste={() => setSilinecek(hedef.id)}
          onSilVazgec={() => setSilinecek(null)}
          onSil={() => hedefSil(hedef.id)}
        />
      ))}

      <button type="button" className="dugme dugme-vurgu" onClick={hedefEkle}>
        + Yeni ölçüm hedefi ekle
      </button>

      {olcumHedefleri.length === 0 && (
        <p className="text-sm text-center px-4" style={{ color: 'var(--c-ink-3)' }}>
          Hiç ölçüm hedefi yok. Ekledikten sonra haftalık değerlendirmede ölçüm alanı çıkar.
        </p>
      )}
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
  duzenleniyor,
  silmeOnayi,
  onDuzenle,
  onDegistir,
  onSilIste,
  onSilVazgec,
  onSil,
}: {
  hedef: OlcumHedefi
  haftaListesi: string[]
  gecenGun: number
  kampGunSayisi: number
  haftalar: Map<string, WeekEntry>
  renk: ReturnType<typeof useTemaRenkleri>
  duzenleniyor: boolean
  silmeOnayi: boolean
  onDuzenle: () => void
  onDegistir: (yama: Partial<OlcumHedefi>) => void
  onSilIste: () => void
  onSilVazgec: () => void
  onSil: () => void
}) {
  const cizgiRengi = renk.sutun.vucut
  const hedefVar = hedef.hedef !== null

  const veri = haftaListesi.map((hb, i) => {
    const oran = haftaListesi.length > 1 ? i / (haftaListesi.length - 1) : 0
    return {
      hafta: hb,
      gercek: haftalar.get(hb)?.olcumler?.[hedef.id] ?? null,
      hedefCizgisi: hedefVar ? hedef.baslangic + (hedef.hedef! - hedef.baslangic) * oran : null,
    }
  })

  const sonGercek = [...veri].reverse().find((n) => n.gercek !== null)?.gercek ?? null
  const durum = hedefVar
    ? hedefDurumu(hedef.baslangic, hedef.hedef!, sonGercek, gecenGun, kampGunSayisi)
    : null

  const projeksiyon =
    sonGercek !== null && gecenGun > 0
      ? hedef.baslangic + ((sonGercek - hedef.baslangic) / gecenGun) * kampGunSayisi
      : null

  const bic = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} ${hedef.birim}`)

  // Eşit aralıklı tam sayı tikler
  const alt = Math.min(hedef.baslangic, hedef.hedef ?? hedef.baslangic)
  const ust = Math.max(hedef.baslangic, hedef.hedef ?? hedef.baslangic)
  const adim = Math.max(Math.round((ust - alt + 4) / 5), 1)
  const eksenAlt = Math.floor((alt - 2) / adim) * adim
  const eksenUst = Math.ceil((ust + 2) / adim) * adim
  const eksenTikleri = Array.from(
    { length: Math.round((eksenUst - eksenAlt) / adim) + 1 },
    (_, i) => eksenAlt + i * adim,
  )

  return (
    <Kart
      baslik={hedefVar ? `${hedef.label}: ${hedef.baslangic} → ${hedef.hedef} ${hedef.birim}` : `${hedef.label} (hedefsiz, izleniyor)`}
      ikon="📏"
      pillar="vucut"
      sag={
        <span className="flex items-center gap-2">
          {durum?.onde !== undefined && durum?.onde !== null && (
            <span className={`rozet ${durum.onde ? 'rozet-iyi' : 'rozet-uyari'}`}>
              <span aria-hidden="true">{durum.onde ? '✓' : '!'}</span>
              {durum.onde ? 'tempoda' : 'geride'}
            </span>
          )}
          <button
            type="button"
            className="dugme px-2 py-1 text-xs"
            aria-label={`${hedef.label} hedefini düzenle`}
            aria-pressed={duzenleniyor}
            onClick={onDuzenle}
          >
            ✏️
          </button>
        </span>
      }
    >
      {duzenleniyor && (
        <div className="alan flex flex-col gap-3" style={{ background: 'var(--c-card-2)' }}>
          <Alan etiket="Ad">
            <input
              className="girdi"
              value={hedef.label}
              onChange={(e) => onDegistir({ label: e.target.value })}
              aria-label="Hedef adı"
            />
          </Alan>
          <Alan etiket="Birim">
            <div className="flex gap-2">
              {['cm', 'kg', '%'].map((b) => (
                <button
                  key={b}
                  type="button"
                  className="dugme flex-1"
                  aria-pressed={hedef.birim === b}
                  style={hedef.birim === b ? { borderColor: 'var(--c-ink-3)', color: 'var(--c-ink)' } : undefined}
                  onClick={() => onDegistir({ birim: b })}
                >
                  {b}
                </button>
              ))}
            </div>
          </Alan>
          <Alan etiket="Başlangıç değeri">
            <Sayi
              deger={hedef.baslangic}
              onChange={(v) => onDegistir({ baslangic: v ?? 0 })}
              min={0}
              max={500}
              adim={hedef.birim === 'kg' ? 0.1 : 0.5}
              birim={hedef.birim}
              etiketi="Başlangıç değeri"
            />
          </Alan>
          <Alan
            etiket="Hedef değer"
            ipucu="Boş bırakırsan hedef konmaz — değer yalnızca izlenir ve grafikte görünür."
          >
            <Sayi
              deger={hedef.hedef ?? undefined}
              onChange={(v) => onDegistir({ hedef: v ?? null })}
              min={0}
              max={500}
              adim={hedef.birim === 'kg' ? 0.1 : 0.5}
              birim={hedef.birim}
              etiketi="Hedef değer"
            />
          </Alan>
          <div className="flex flex-wrap gap-2">
            {silmeOnayi ? (
              <>
                <span className="text-sm self-center">Silinsin mi? Girilen ölçümler de gider.</span>
                <button type="button" className="dugme dugme-tehlike" onClick={onSil}>Evet, sil</button>
                <button type="button" className="dugme" onClick={onSilVazgec}>Vazgeç</button>
              </>
            ) : (
              <button type="button" className="dugme dugme-tehlike" onClick={onSilIste}>
                🗑 Hedefi sil
              </button>
            )}
          </div>
        </div>
      )}

      <div className="alan grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Şu an</div>
          <div className="rakam font-semibold text-lg">{bic(sonGercek)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Bugün olmalı</div>
          <div className="rakam font-semibold text-lg">{durum ? bic(durum.beklenen) : '—'}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Hedef</div>
          <div className="rakam font-semibold text-lg">
            {hedefVar ? `${hedef.hedef} ${hedef.birim}` : '—'}
          </div>
        </div>
      </div>

      {durum && (
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
              Bu tempoyla {kampGunSayisi}. günde yaklaşık{' '}
              <strong className="rakam">{projeksiyon.toFixed(1)} {hedef.birim}</strong> olursun.
            </p>
          )}
        </div>
      )}

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
              domain={[eksenAlt, eksenUst]} ticks={eksenTikleri}
            />
            <Tooltip
              cursor={{ stroke: renk.ink3, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const n = payload[0].payload as (typeof veri)[number]
                return (
                  <div
                    className="rounded-lg px-3 py-2 text-xs shadow-lg"
                    style={{ background: 'var(--c-card)', border: '1px solid var(--c-cizgi)' }}
                  >
                    <div style={{ color: 'var(--c-ink-3)' }}>{uzunTarih(n.hafta)} haftası</div>
                    <div className="rakam font-semibold">Ölçüm: {bic(n.gercek)}</div>
                    {n.hedefCizgisi !== null && (
                      <div className="rakam" style={{ color: 'var(--c-ink-3)' }}>
                        Hedef çizgisi: {n.hedefCizgisi.toFixed(1)} {hedef.birim}
                      </div>
                    )}
                  </div>
                )
              }}
            />
            {hedefVar && (
              <Line
                type="linear" dataKey="hedefCizgisi" name="Hedef çizgisi"
                stroke={renk.ink3} strokeWidth={1.5} strokeDasharray="5 4"
                dot={false} isAnimationActive={false}
              />
            )}
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
          {hedefVar && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" style={{ width: 14, height: 0, borderTop: `2px dashed ${renk.ink3}` }} />
              Hedef çizgisi
            </span>
          )}
        </div>
      </div>
    </Kart>
  )
}
