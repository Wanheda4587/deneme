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
