import type { CSSProperties, ReactNode } from 'react'
import type { Pillar } from '../../lib/types.ts'

export function sutunRengi(p: Pillar): string {
  return `var(--p-${p})`
}

/** Sütun rengini alt bileşenlere CSS değişkeni olarak geçirir. */
export function sutunStili(p: Pillar): CSSProperties {
  return { ['--sutun-renk' as string]: sutunRengi(p) } as CSSProperties
}

export function Kart({
  baslik,
  ikon,
  pillar,
  sag,
  children,
}: {
  baslik?: string
  ikon?: string
  pillar?: Pillar
  sag?: ReactNode
  children: ReactNode
}) {
  const stil = pillar
    ? ({ ...sutunStili(pillar), borderLeftColor: sutunRengi(pillar) } as CSSProperties)
    : undefined
  return (
    <section className={`kart ${pillar ? 'sutun-seridi' : ''}`} style={stil}>
      {baslik && (
        <header className="kart-basligi">
          {ikon && <span aria-hidden="true">{ikon}</span>}
          <h2 className="flex-1">{baslik}</h2>
          {sag}
        </header>
      )}
      {children}
    </section>
  )
}

export function Alan({
  etiket,
  ipucu,
  htmlFor,
  sag,
  children,
}: {
  etiket: string
  ipucu?: string
  htmlFor?: string
  sag?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="alan">
      <div className="flex items-baseline justify-between gap-2">
        <label className="etiket" htmlFor={htmlFor}>
          {etiket}
        </label>
        {sag}
      </div>
      {children}
      {ipucu && <p className="ipucu">{ipucu}</p>}
    </div>
  )
}

export function TemizleDugmesi({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs mb-2"
      style={{ color: 'var(--c-ink-3)' }}
    >
      temizle
    </button>
  )
}

export function IlerlemeCubugu({
  oran,
  renk,
  etiket,
}: {
  oran: number
  renk?: string
  etiket: string
}) {
  const yuzde = Math.min(Math.max(oran, 0), 1) * 100
  return (
    <div
      className="ilerleme"
      role="progressbar"
      aria-valuenow={Math.round(yuzde)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiket}
      style={{ ['--dolgu' as string]: renk ?? 'var(--c-ink-2)' } as CSSProperties}
    >
      <span style={{ width: `${yuzde}%` }} />
    </div>
  )
}
