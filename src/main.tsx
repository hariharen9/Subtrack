import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Drop the pre-paint boot markup before the console mounts.
document.getElementById('boot')?.remove()

const container = document.getElementById('root')
if (!container) throw new Error('SUBTRACK: #root container is missing')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
