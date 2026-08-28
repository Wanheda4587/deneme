/** Çakışmayan kısa kimlik. crypto yoksa zaman + rastgele son çare. */
export function yeniId(onek: string): string {
  const rastgele =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${onek}_${rastgele}`
}
