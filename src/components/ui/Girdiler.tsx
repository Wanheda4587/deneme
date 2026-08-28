import { useId, useState } from 'react'
import type { MetricDef } from '../../lib/metrics.ts'
import { Alan, TemizleDugmesi } from './Kart.tsx'

// ── Ölçek 1-10: tek dokunuşla seçilir, aynı düğmeye tekrar basınca temizlenir ──
export function Olcek({
  deger,
  onChange,
  etiketi,
}: {
  deger: number | undefined
  onChange: (v: number | undefined) => void
  etiketi: string
}) {
  return (
    <div className="olcek" role="group" aria-label={etiketi}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className="olcek-dugme"
          aria-pressed={deger === n}
          aria-label={`${n} / 10`}
          onClick={() => onChange(deger === n ? undefined : n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ── Yüzde: kaydırıcı + elle yazılabilen kutu (küsürat serbest) ───────────
export function Yuzde({
  deger,
  onChange,
  adim = 0.5,
  etiketi,
}: {
  deger: number | undefined
  onChange: (v: number | undefined) => void
  adim?: number
  etiketi: string
}) {
  const id = useId()
  // Yazarken "72." gibi yarım girdiler silinmesin diye ham metin ayrıca tutulur.
  const [ham, setHam] = useState<string | null>(null)
  const gosterilen = ham ?? (deger === undefined ? '' : String(deger))

  const yaz = (metin: string) => {
    setHam(metin)
    if (metin.trim() === '') return onChange(undefined)
    const n = Number(metin.replace(',', '.'))
    if (Number.isFinite(n)) onChange(Math.min(Math.max(n, 0), 100))
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        className="kaydirici flex-1"
        min={0}
        max={100}
        step={adim}
        value={deger ?? 0}
        aria-label={`${etiketi} kaydırıcı`}
        onChange={(e) => {
          setHam(null)
          onChange(Number(e.target.value))
        }}
      />
      <div className="relative shrink-0" style={{ width: '5.5rem' }}>
        <span
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: deger === undefined ? 'var(--c-ink-3)' : 'var(--sutun-renk)' }}
        >
          %
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="girdi rakam font-semibold text-right"
          style={{ paddingLeft: '1.5rem' }}
          value={gosterilen}
          placeholder="—"
          aria-label={etiketi}
          onChange={(e) => yaz(e.target.value)}
          onBlur={() => setHam(null)}
        />
      </div>
    </div>
  )
}

// ── Sayı: − / + düğmeleri + doğrudan yazma ───────────────────────────────
export function Sayi({
  deger,
  onChange,
  min = 0,
  max = 9999,
  adim = 1,
  birim,
  etiketi,
  id,
}: {
  deger: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  adim?: number
  birim?: string
  etiketi: string
  id?: string
}) {
  const kenetle = (v: number) => Math.min(Math.max(v, min), max)
  // Ondalık adımlarda kayan nokta artıklarını temizler (0.1+0.2 sorunu).
  const yuvarla = (v: number) => Math.round(v * 1000) / 1000

  return (
    <div className="sayaç">
      <button
        type="button"
        className="sayaç-dugme"
        aria-label={`${etiketi} azalt`}
        disabled={deger !== undefined && deger <= min}
        onClick={() => onChange(yuvarla(kenetle((deger ?? 0) - adim)))}
      >
        −
      </button>
      <div className="relative flex-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="girdi"
          min={min}
          max={max}
          step={adim}
          value={deger ?? ''}
          placeholder="—"
          aria-label={etiketi}
          onChange={(e) => {
            const ham = e.target.value
            if (ham === '') return onChange(undefined)
            const n = Number(ham)
            onChange(Number.isFinite(n) ? n : undefined)
          }}
          onBlur={(e) => {
            if (e.target.value === '') return
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(yuvarla(kenetle(n)))
          }}
        />
        {birim && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: 'var(--c-ink-3)' }}
          >
            {birim}
          </span>
        )}
      </div>
      <button
        type="button"
        className="sayaç-dugme"
        aria-label={`${etiketi} artır`}
        disabled={deger !== undefined && deger >= max}
        onClick={() => onChange(yuvarla(kenetle((deger ?? 0) + adim)))}
      >
        +
      </button>
    </div>
  )
}


// ── Süre: saat + dakika (7 sa 15 dk). Değer ondalık saat olarak saklanır. ──
export function Sure({
  deger,
  onChange,
  max = 24,
  etiketi,
}: {
  deger: number | undefined
  onChange: (v: number | undefined) => void
  max?: number
  etiketi: string
}) {
  const saat = deger === undefined ? undefined : Math.floor(deger)
  // Kayan nokta artığı 14.999… gibi değerler üretmesin diye yuvarlanır
  const dakika = deger === undefined ? undefined : Math.round((deger - Math.floor(deger)) * 60)

  const birlestir = (sa: number | undefined, dk: number | undefined) => {
    if (sa === undefined && dk === undefined) return onChange(undefined)
    const toplam = (sa ?? 0) + (dk ?? 0) / 60
    onChange(Math.min(Math.max(Math.round(toplam * 60) / 60, 0), max))
  }

  const kutu = (
    tip: 'saat' | 'dakika',
    v: number | undefined,
    ust: number,
    ek: string,
  ) => (
    <div className="relative flex-1">
      <input
        type="number"
        inputMode="numeric"
        className="girdi rakam text-center"
        style={{ paddingRight: '2.2rem' }}
        min={0}
        max={ust}
        step={tip === 'dakika' ? 5 : 1}
        value={v ?? ''}
        placeholder="—"
        aria-label={`${etiketi} ${tip}`}
        onChange={(e) => {
          const ham = e.target.value
          const n = ham === '' ? undefined : Number(ham)
          const gecerli = n === undefined || !Number.isFinite(n) ? undefined : n
          if (tip === 'saat') birlestir(gecerli, dakika)
          else birlestir(saat, gecerli)
        }}
      />
      <span
        aria-hidden="true"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
        style={{ color: 'var(--c-ink-3)' }}
      >
        {ek}
      </span>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {kutu('saat', saat, max, 'sa')}
      {kutu('dakika', dakika, 59, 'dk')}
    </div>
  )
}

// ── Evet / Hayır ─────────────────────────────────────────────────────────
export function EvetHayir({
  deger,
  onChange,
  etiketi,
}: {
  deger: boolean | undefined
  onChange: (v: boolean | undefined) => void
  etiketi: string
}) {
  return (
    <div className="segment" role="group" aria-label={etiketi}>
      <button
        type="button"
        className="segment-dugme"
        aria-pressed={deger === true}
        onClick={() => onChange(deger === true ? undefined : true)}
      >
        Evet
      </button>
      <button
        type="button"
        className="segment-dugme"
        aria-pressed={deger === false}
        onClick={() => onChange(deger === false ? undefined : false)}
      >
        Hayır
      </button>
    </div>
  )
}

// ── Metin ────────────────────────────────────────────────────────────────
export function MetinAlani({
  deger,
  onChange,
  placeholder,
  satir = 2,
  etiketi,
  id,
}: {
  deger: string | undefined
  onChange: (v: string) => void
  placeholder?: string
  satir?: number
  etiketi: string
  id?: string
}) {
  return (
    <textarea
      id={id}
      className="girdi"
      rows={satir}
      value={deger ?? ''}
      placeholder={placeholder}
      aria-label={etiketi}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// ── Metrik tanımından doğru kontrolü seçen sarmalayıcı ───────────────────
// Formun config-driven olmasını sağlayan yer burası: yeni metrik eklendiğinde
// hiçbir ekran değişmez, alan kendiliğinden doğru kontrolle çizilir.
export function MetrikAlani({
  def,
  deger,
  onChange,
}: {
  def: MetricDef
  deger: number | boolean | undefined
  onChange: (v: number | boolean | undefined) => void
}) {
  const id = useId()
  const doluMu = deger !== undefined

  const kontrol = () => {
    switch (def.type) {
      case 'bool':
        return (
          <EvetHayir
            deger={deger as boolean | undefined}
            onChange={onChange}
            etiketi={def.label}
          />
        )
      case 'scale':
        return (
          <Olcek deger={deger as number | undefined} onChange={onChange} etiketi={def.label} />
        )
      case 'percent':
        return (
          <Yuzde
            deger={deger as number | undefined}
            onChange={onChange}
            adim={def.step ?? 5}
            etiketi={def.label}
          />
        )
      case 'sure':
        return (
          <Sure
            deger={deger as number | undefined}
            onChange={onChange}
            max={def.max ?? 24}
            etiketi={def.label}
          />
        )
      case 'number':
        return (
          <Sayi
            id={id}
            deger={deger as number | undefined}
            onChange={onChange}
            min={def.min}
            max={def.max}
            adim={def.step ?? 1}
            birim={def.birim}
            etiketi={def.label}
          />
        )
    }
  }

  return (
    <Alan
      etiket={def.label}
      ipucu={def.ipucu}
      htmlFor={def.type === 'number' ? id : undefined}
      sag={doluMu ? <TemizleDugmesi onClick={() => onChange(undefined)} /> : undefined}
    >
      {kontrol()}
    </Alan>
  )
}
