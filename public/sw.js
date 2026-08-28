// Basit çevrimdışı desteği.
// - Hash'li varlıklar (assets/…) değişmez, önce önbellekten verilir.
// - Sayfa isteklerinde önce ağ denenir; ağ yoksa önbellekteki kabuk döner.
// Böylece yeni sürüm yayınlandığında eski kod takılıp kalmaz.
const SURUM = 'kamp90-v1'
const KABUK = './index.html'

self.addEventListener('install', (olay) => {
  olay.waitUntil(
    caches.open(SURUM).then((c) => c.addAll([KABUK, './manifest.webmanifest', './icon.svg'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    caches.keys().then((adlar) =>
      Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (olay) => {
  const istek = olay.request
  if (istek.method !== 'GET') return
  const url = new URL(istek.url)
  if (url.origin !== self.location.origin) return

  // Sayfa gezinmeleri: önce ağ, olmazsa önbellekteki kabuk
  if (istek.mode === 'navigate') {
    olay.respondWith(
      fetch(istek)
        .then((yanit) => {
          const kopya = yanit.clone()
          caches.open(SURUM).then((c) => c.put(KABUK, kopya))
          return yanit
        })
        .catch(() => caches.match(KABUK).then((y) => y ?? Response.error())),
    )
    return
  }

  // Diğer istekler: önbellekte varsa oradan, yoksa ağdan al ve sakla
  olay.respondWith(
    caches.match(istek).then((onbellek) => {
      if (onbellek) return onbellek
      return fetch(istek).then((yanit) => {
        if (yanit.ok && yanit.type === 'basic') {
          const kopya = yanit.clone()
          caches.open(SURUM).then((c) => c.put(istek, kopya))
        }
        return yanit
      })
    }),
  )
})
