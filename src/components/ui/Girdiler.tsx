import { useId } from 'react'
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

// ── Yüzde: kaydırıcı + büyük okunur değer ────────────────────────────────
export function Yuzde({
  deger,
  onChange,
  adim = 5,
  etiketi,
}: {
  deger: number | undefined
  onChange: (v: number | undefined) => void
  adim?: number
  etiketi: string
}) {
  const secili = deger !== undefined
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        className="kaydirici flex-1"
        min={0}
        max={100}
        step={adim}
        value={deger ?? 0}
        aria-label={etiketi}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        className="rakam text-lg font-semibold tabular-nums w-16 text-right"
        style={{ color: secili ? 'var(--sutun-renk)' : 'var(--c-ink-3)' }}
      >
        {secili ? `%${deger}` : '—'}
      </span>
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
