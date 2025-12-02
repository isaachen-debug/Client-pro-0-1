import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

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

