import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { StoreProvider } from './state/store.tsx'
import './styles.css'

const kok = document.getElementById('root')
if (!kok) throw new Error('#root bulunamadı')

createRoot(kok).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)

// Telefonda ana ekrana eklenip internetsiz açılabilmesi için.
// Geliştirme sunucusunda kayıt yapılmaz — eski kodun önbellekte takılmasını önler.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((e) => console.warn('Service worker kaydedilemedi:', e))
  })
}
