import { useEffect, useState } from 'react'
import type { Pillar } from '../lib/types.ts'
import { useStore } from './store.tsx'

export interface TemaRenkleri {
  sutun: Record<Pillar, string>
  izgara: string
  ink: string
  ink2: string
  ink3: string
  kart: string
  cizgi: string
  iyi: string
  kotu: string
}

function oku(ad: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim()
}

/**
 * Tema renklerini CSS değişkenlerinden okur. SVG sunum özniteliklerinde `var()`
 * güvenilir çalışmadığı için grafiklere çözülmüş hex değeri verilmesi gerekiyor;
 * böylece renklerin tek kaynağı yine styles.css oluyor.
 */
export function useTemaRenkleri(): TemaRenkleri {
  const { ayarlar } = useStore()
  const [renkler, setRenkler] = useState<TemaRenkleri>(() => topla())

  useEffect(() => {
    // Tema değişimi <html data-theme> üzerine yazıldıktan sonra okunmalı.
    const id = requestAnimationFrame(() => setRenkler(topla()))
    return () => cancelAnimationFrame(id)
  }, [ayarlar.tema])

  return renkler
}

function topla(): TemaRenkleri {
  return {
    sutun: {
      vucut: oku('--p-vucut'),
      enerji: oku('--p-enerji'),
      disiplin: oku('--p-disiplin'),
      ozguven: oku('--p-ozguven'),
      gelir: oku('--p-gelir'),
    },
    izgara: oku('--izgara'),
    ink: oku('--c-ink'),
    ink2: oku('--c-ink-2'),
    ink3: oku('--c-ink-3'),
    kart: oku('--c-card'),
    cizgi: oku('--c-cizgi'),
    iyi: oku('--d-iyi'),
    kotu: oku('--d-kotu'),
  }
}
