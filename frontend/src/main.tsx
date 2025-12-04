import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if (typeof window !== 'undefined') {
  const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
    const message =
      event instanceof PromiseRejectionEvent ? event.reason?.message : (event as ErrorEvent).message
    if (typeof message === 'string' && (message.includes('ChunkLoadError') || message.includes('Loading chunk'))) {
      window.location.reload()
    }
  }

  window.addEventListener('error', handleChunkError)
  window.addEventListener('unhandledrejection', handleChunkError)
}

if (import.meta.env.PROD) {
  const registerSW = async () => {
    const { registerSW: register } = await import('virtual:pwa-register')
    register({ immediate: true })
  }
  registerSW()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

