import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PantallaEntrada } from './autenticacion/PantallaEntrada'
import { AutenticacionSupabase } from './supabase/autenticacionSupabase'
import { crearCliente } from './supabase/cliente'
import { RepositorioSupabase } from './supabase/repositorioSupabase'

const raiz = createRoot(document.getElementById('root')!)

async function iniciar() {
  const cliente = crearCliente()
  const autenticacion = await AutenticacionSupabase.abrir(cliente, location.origin + location.pathname)
  // Sin sesión solo se ve la pantalla de entrada; con ella, las quedadas son las de la cuenta.
  if (!cliente || !autenticacion.actual()) return <PantallaEntrada autenticacion={autenticacion} />
  return <App repositorio={new RepositorioSupabase(cliente)} autenticacion={autenticacion} />
}

iniciar().then(
  (vista) => raiz.render(<StrictMode>{vista}</StrictMode>),
  (error: unknown) => {
    console.error(error)
    raiz.render(<p role="alert">No se pudo iniciar la aplicación.</p>)
  },
)
