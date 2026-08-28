import { lazy, Suspense, useState } from 'react'
import { Bugun } from './pages/Bugun.tsx'
import { Hafta } from './pages/Hafta.tsx'
import { Gecmis } from './pages/Gecmis.tsx'
import { Ayarlar } from './pages/Ayarlar.tsx'

// Grafik kütüphanesi ağır; her gün açılan Bugün ekranını yavaşlatmasın diye
// yalnızca grafik ekranlarına girildiğinde yüklenir.
const Trendler = lazy(() => import('./pages/Trendler.tsx').then((m) => ({ default: m.Trendler })))
const Hedefler = lazy(() => import('./pages/Hedefler.tsx').then((m) => ({ default: m.Hedefler })))
import { useStore } from './state/store.tsx'

type SekmeId = 'bugun' | 'hafta' | 'trendler' | 'hedefler' | 'gecmis' | 'ayarlar'

const SEKMELER: { id: SekmeId; label: string; ikon: string; altBar: boolean }[] = [
  { id: 'bugun', label: 'Bugün', ikon: '📋', altBar: true },
  { id: 'hafta', label: 'Hafta', ikon: '📅', altBar: true },
  { id: 'trendler', label: 'Trendler', ikon: '📈', altBar: true },
  { id: 'hedefler', label: 'Hedefler', ikon: '🎯', altBar: true },
  { id: 'gecmis', label: 'Geçmiş', ikon: '🗓️', altBar: true },
  { id: 'ayarlar', label: 'Ayarlar', ikon: '⚙️', altBar: false },
]

function Yukleniyor() {
  return (
    <p className="kart p-6 text-center text-sm" style={{ color: 'var(--c-ink-3)' }}>
      Grafikler yükleniyor…
    </p>
  )
}

function Ekran({ sekme }: { sekme: SekmeId }) {
  switch (sekme) {
    case 'bugun': return <Bugun />
    case 'hafta': return <Hafta />
    case 'trendler': return <Suspense fallback={<Yukleniyor />}><Trendler /></Suspense>
    case 'hedefler': return <Suspense fallback={<Yukleniyor />}><Hedefler /></Suspense>
    case 'gecmis': return <Gecmis />
    case 'ayarlar': return <Ayarlar />
  }
}

export default function App() {
  const [sekme, setSekme] = useState<SekmeId>('bugun')
  const { hazir, kaydediliyor, hata } = useStore()

  if (!hazir) {
    return (
      <div className="min-h-full grid place-items-center p-8">
        <p style={{ color: 'var(--c-ink-3)' }}>Yükleniyor…</p>
      </div>
    )
  }

  const baslik = SEKMELER.find((s) => s.id === sekme)?.label ?? ''

  return (
    <div className="min-h-full flex">
      {/* Masaüstü: yan menü */}
      <aside
        className="hidden md:flex flex-col gap-1 w-56 shrink-0 p-3 border-r sticky top-0 h-screen"
        style={{ borderColor: 'var(--c-cizgi)', background: 'var(--c-card)' }}
      >
        <div className="px-3 py-4">
          <div className="font-bold leading-tight">90 Gün Kampı</div>
          <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
            kişisel gelişim takibi
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {SEKMELER.map((s) => (
            <button
              key={s.id}
              type="button"
              className="yan-baglanti"
              aria-current={sekme === s.id ? 'page' : undefined}
              onClick={() => setSekme(s.id)}
            >
              <span aria-hidden="true">{s.ikon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Üst başlık */}
        <header
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b backdrop-blur"
          style={{
            borderColor: 'var(--c-cizgi)',
            background: 'color-mix(in oklab, var(--c-bg) 88%, transparent)',
          }}
        >
          <h1 className="flex-1 font-semibold">{baslik}</h1>
          <span
            className="text-xs rakam"
            style={{ color: 'var(--c-ink-3)' }}
            aria-live="polite"
          >
            {kaydediliyor ? 'kaydediliyor…' : 'kayıtlı'}
          </span>
          <button
            type="button"
            className="md:hidden dugme px-2 py-1"
            aria-label="Ayarlar"
            aria-current={sekme === 'ayarlar' ? 'page' : undefined}
            onClick={() => setSekme('ayarlar')}
          >
            ⚙️
          </button>
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

        <main className="flex-1 p-4 pb-28 md:pb-8 max-w-2xl w-full mx-auto">
          <Ekran sekme={sekme} />
        </main>

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
              onClick={() => setSekme(s.id)}
            >
              <span className="sekme-ikon" aria-hidden="true">{s.ikon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
