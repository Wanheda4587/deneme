import { useId } from 'react'
import type { NoktaSerisi } from '../../lib/stats.ts'

/**
 * Küçük eğilim çizgisi — saf SVG.
 * Panel her açılışta görüldüğü için bilerek grafik kütüphanesi kullanılmıyor;
 * ağır paketi yalnızca Trendler ve Hedefler ekranları yüklüyor.
 */
export function Sparkline({
  seri,
  renk,
  yukseklik = 34,
  etiket,
}: {
  seri: NoktaSerisi[]
  renk: string
  yukseklik?: number
  etiket: string
}) {
  const id = useId()
  const genislik = 100
  const dolu = seri.filter((n) => n.deger !== null)
  if (dolu.length < 2) {
    return (
      <div
        style={{ height: yukseklik, color: 'var(--c-ink-3)' }}
        className="flex items-center text-xs"
      >
        yeterli veri yok
      </div>
    )
  }

  const degerler = dolu.map((n) => n.deger as number)
  const alt = Math.min(...degerler)
  const ust = Math.max(...degerler)
  const menzil = ust - alt || 1
  const ic = 3 // üst/alt boşluk, çizgi kenarda kırpılmasın

  const x = (i: number) => (i / (seri.length - 1)) * genislik
  const y = (v: number) =>
    yukseklik - ic - ((v - alt) / menzil) * (yukseklik - ic * 2)

  // Boş günlerde çizgi kopsun — olmayan veri uydurulmasın
  const parcalar: string[] = []
  let aktif: string[] = []
  seri.forEach((n, i) => {
    if (n.deger === null) {
      if (aktif.length > 1) parcalar.push(aktif.join(' '))
      aktif = []
      return
    }
    aktif.push(`${aktif.length === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(n.deger).toFixed(2)}`)
  })
  if (aktif.length > 1) parcalar.push(aktif.join(' '))

  const sonIndex = seri.map((n) => n.deger).lastIndexOf(degerler[degerler.length - 1])
  const sonNokta = { x: x(sonIndex), y: y(degerler[degerler.length - 1]) }

  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      preserveAspectRatio="none"
      width="100%"
      height={yukseklik}
      role="img"
      aria-label={etiket}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <title id={id}>{etiket}</title>
      {parcalar.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={renk}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={sonNokta.x} cy={sonNokta.y} r={2.5} fill={renk} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
