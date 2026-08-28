// Aktif depolama adaptörünü seçen tek yer.
// Faz 4'te Supabase eklendiğinde değişecek dosya sadece burası olacak.
import type { StorageAdapter } from './adapter.ts'
import { LocalStorageAdapter } from './local.ts'

export type { StorageAdapter } from './adapter.ts'
export { VARSAYILAN_AYARLAR } from './adapter.ts'

let ornek: StorageAdapter | null = null

export function depo(): StorageAdapter {
  if (!ornek) ornek = new LocalStorageAdapter()
  return ornek
}
