import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { abrirRepositorio } from './dominio/abrirRepositorio'
import { AutenticacionSupabase } from './supabase/autenticacionSupabase'
import { crearCliente } from './supabase/cliente'
import { RepositorioSupabase } from './supabase/repositorioSupabase'

const raiz = createRoot(document.getElementById('root')!)

async function iniciar() {
  const cliente = crearCliente()
  const volverA = location.origin + location.pathname
  const autenticacion = await AutenticacionSupabase.abrir(cliente, volverA)
  // Con sesión, las quedadas son las de la cuenta (en Supabase); sin ella, las locales del navegador.
  const repositorio = cliente && autenticacion.actual() ? new RepositorioSupabase(cliente) : await abrirRepositorio()
  return { repositorio, autenticacion: cliente ? autenticacion : undefined }
}

iniciar().then(
  ({ repositorio, autenticacion }) =>
    raiz.render(
      <StrictMode>
        <App repositorio={repositorio} autenticacion={autenticacion} />
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error)
    raiz.render(<p role="alert">No se pudo abrir la base de datos.</p>)
  },
)
