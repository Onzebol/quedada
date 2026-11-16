import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { abrirRepositorio } from './dominio/abrirRepositorio'

const raiz = createRoot(document.getElementById('root')!)

abrirRepositorio().then(
  (repositorio) =>
    raiz.render(
      <StrictMode>
        <App repositorio={repositorio} />
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error)
    raiz.render(<p role="alert">No se pudo abrir la base de datos.</p>)
  },
)
