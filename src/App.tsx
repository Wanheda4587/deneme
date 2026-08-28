import { lazy, Suspense, useEffect, useState } from 'react'
import { Panel } from './pages/Panel.tsx'
import { Bugun } from './pages/Bugun.tsx'
import { Hafta } from './pages/Hafta.tsx'
import { Gecmis } from './pages/Gecmis.tsx'
import { Ayarlar } from './pages/Ayarlar.tsx'
import { MikroHedefler } from './pages/MikroHedefler.tsx'
import { useStore } from './state/store.tsx'

// Grafik kütüphanesi ağır; Panel ve Bugün ekranlarını yavaşlatmasın diye
// yalnızca bu iki ekrana girildiğinde yüklenir.
const Trendler = lazy(() => import('./pages/Trendler.tsx').then((m) => ({ default: m.Trendler })))
const Hedefler = lazy(() => import('./pages/Hedefler.tsx').then((m) => ({ default: m.Hedefler })))

export type SekmeId =
  | 'panel' | 'bugun' | 'hafta' | 'trendler'
  | 'hedefler' | 'mikro' | 'gecmis' | 'ayarlar'

interface Sekme {
  id: SekmeId
  label: string
  /** Alt çubukta yer darsa kullanılan kısa ad. */
  kisa?: string
  ikon: string
  /** Telefonda alt çubukta mı, "Daha" menüsünde mi. */
  altBar: boolean
  /** Masaüstünde geniş yerleşim kullanılsın mı. */
  genis?: boolean
}

const SEKMELER: Sekme[] = [
  { id: 'panel', label: 'Panel', ikon: '🏠', altBar: true, genis: true },
  { id: 'bugun', label: 'Bugün', ikon: '📋', altBar: true },
  { id: 'hafta', label: 'Hafta', ikon: '📅', altBar: true },
  { id: 'trendler', label: 'Trendler', ikon: '📈', altBar: true, genis: true },
  { id: 'hedefler', label: 'Hedefler', ikon: '🎯', altBar: false },
  { id: 'mikro', label: 'Mikro Hedefler', kisa: 'Mikro', ikon: '✅', altBar: false },
  { id: 'gecmis', label: 'Geçmiş', ikon: '🗓️', altBar: false },
  { id: 'ayarlar', label: 'Ayarlar', ikon: '⚙️', altBar: false },
]

function Yukleniyor() {
  return (
    <p className="kart p-6 text-center text-sm" style={{ color: 'var(--c-ink-3)' }}>
      Grafikler yükleniyor…
    </p>
  )
}

function Ekran({ sekme, git }: { sekme: SekmeId; git: (s: SekmeId) => void }) {
  switch (sekme) {
    case 'panel': return <Panel git={(s) => git(s as SekmeId)} />
    case 'bugun': return <Bugun />
    case 'hafta': return <Hafta />
    case 'trendler': return <Suspense fallback={<Yukleniyor />}><Trendler /></Suspense>
    case 'hedefler': return <Suspense fallback={<Yukleniyor />}><Hedefler /></Suspense>
    case 'mikro': return <MikroHedefler />
    case 'gecmis': return <Gecmis />
    case 'ayarlar': return <Ayarlar />
  }
}

export default function App() {
  const [sekme, setSekme] = useState<SekmeId>('panel')
  const [dahaAcik, setDahaAcik] = useState(false)
  const { hazir, kaydediliyor, hata } = useStore()

  const git = (s: SekmeId) => {
    setSekme(s)
    setDahaAcik(false)
    window.scrollTo({ top: 0 })
  }

  // "Daha" menüsü açıkken Esc ile kapansın
  useEffect(() => {
    if (!dahaAcik) return
    const kapat = (e: KeyboardEvent) => e.key === 'Escape' && setDahaAcik(false)
    window.addEventListener('keydown', kapat)
    return () => window.removeEventListener('keydown', kapat)
  }, [dahaAcik])

  if (!hazir) {
    return (
      <div className="min-h-full grid place-items-center p-8">
        <p style={{ color: 'var(--c-ink-3)' }}>Yükleniyor…</p>
      </div>
    )
  }

  const aktif = SEKMELER.find((s) => s.id === sekme)
  const dahaIcinde = aktif && !aktif.altBar

  return (
    <div className="min-h-full flex">
      {/* Masaüstü: yan menü */}
      <aside
        className="hidden md:flex flex-col gap-1 w-56 shrink-0 p-3 border-r sticky top-0 h-screen"
        style={{ borderColor: 'var(--c-cizgi)', background: 'var(--c-card)' }}
      >
        <div className="px-3 py-4">
          <div className="font-bold leading-tight">90 Gün Kampı</div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>kişisel gelişim takibi</div>
        </div>
        <nav className="flex flex-col gap-1">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              className="yan-baglanti"
              aria-current={sekme === s.id ? 'page' : undefined}
              onClick={() => git(s.id)}
            >
              <span aria-hidden="true">{s.ikon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b backdrop-blur"
          style={{
            borderColor: 'var(--c-cizgi)',
            background: 'color-mix(in oklab, var(--c-bg) 88%, transparent)',
          }}
        >
          <h1 className="flex-1 font-semibold truncate">{aktif?.label ?? ''}</h1>
          <span className="text-xs rakam" style={{ color: 'var(--c-ink-3)' }} aria-live="polite">
            {kaydediliyor ? 'kaydediliyor…' : 'kayıtlı'}
          </span>
        </header>

        {hata && (
          <p
            className="mx-4 mt-3 rounded-lg px-3 py-2 text-sm"
            role="alert"
            style={{
              color: 'var(--d-kotu)',
              border: '1px solid color-mix(in oklab, var(--d-kotu) 45%, var(--c-cizgi))',
            }}
          >
            ⚠️ {hata}
          </p>
        )}

        <main
          className={`flex-1 p-4 pb-28 md:pb-8 w-full mx-auto ${aktif?.genis ? 'max-w-5xl' : 'max-w-2xl'}`}
        >
          <Ekran sekme={sekme} git={git} />
        </main>

        {/* Telefon: "Daha" menüsü */}
        {dahaAcik && (
          <>
            <button
              type="button"
              className="md:hidden fixed inset-0 z-20"
              aria-label="Menüyü kapat"
              style={{ background: 'rgb(0 0 0 / 0.5)' }}
              onClick={() => setDahaAcik(false)}
            />
            <div
              className="md:hidden fixed bottom-0 inset-x-0 z-30 rounded-t-2xl border-t p-3 pb-6"
              role="dialog"
              aria-label="Diğer ekranlar"
              style={{ borderColor: 'var(--c-cizgi)', background: 'var(--c-card)' }}
            >
              {SEKMELER.filter((s) => !s.altBar).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="yan-baglanti"
                  aria-current={sekme === s.id ? 'page' : undefined}
                  onClick={() => git(s.id)}
                >
                  <span aria-hidden="true">{s.ikon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Telefon: alt sekme çubuğu */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t"
          style={{
            borderColor: 'var(--c-cizgi)',
            background: 'var(--c-card)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {SEKMELER.filter((s) => s.altBar).map((s) => (
            <button
              key={s.id}
              type="button"
              className="sekme"
              aria-current={sekme === s.id ? 'page' : undefined}
              onClick={() => git(s.id)}
            >
              <span className="sekme-ikon" aria-hidden="true">{s.ikon}</span>
              {s.kisa ?? s.label}
            </button>
          ))}
          <button
            type="button"
            className="sekme"
            aria-expanded={dahaAcik}
            aria-current={dahaIcinde ? 'page' : undefined}
            onClick={() => setDahaAcik((o) => !o)}
          >
            <span className="sekme-ikon" aria-hidden="true">⋯</span>
            Daha
          </button>
        </nav>
      </div>
    </div>
  )
}
