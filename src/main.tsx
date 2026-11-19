import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { restaurarEnlacePendiente } from './autenticacion/enlacePendiente'
import { proveedorGoogleId } from './autenticacion/googleId'
import { PantallaEntrada } from './autenticacion/PantallaEntrada'
import { ActualizacionPwa } from './pwa/ActualizacionPwa'
import { AutenticacionSupabase } from './supabase/autenticacionSupabase'
import { InvitacionesSupabase } from './invitaciones/invitacionesSupabase'
import { crearCliente } from './supabase/cliente'
import { RepositorioSupabase } from './supabase/repositorioSupabase'
import { AlmacenSupabase } from './tiques/almacenSupabase'
import { reducirImagen } from './tiques/reducirImagen'

const raiz = createRoot(document.getElementById('root')!)

async function iniciar() {
  const cliente = crearCliente()
  // Con Client ID de Google se usa su botón (sin pasar por la URL de Supabase, #148); sin él, la redirección.
  const idGoogle = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const autenticacion = await AutenticacionSupabase.abrir(cliente, location.origin + location.pathname, idGoogle ? proveedorGoogleId(idGoogle) : undefined)
  // Sin sesión solo se ve la pantalla de entrada; con ella, las quedadas son las de la cuenta.
  if (!cliente || !autenticacion.actual()) return <PantallaEntrada autenticacion={autenticacion} />
  // Si se llegó con un enlace (invitación o quedada) y se pasó por Google, se recupera antes de pintar.
  restaurarEnlacePendiente()
  // Al cerrar sesión se recarga: sin sesión la página vuelve a la pantalla de entrada.
  return (
    <App
      repositorio={new RepositorioSupabase(cliente, autenticacion.actual()?.id)}
      autenticacion={autenticacion}
      alSalir={() => location.reload()}
      invitaciones={new InvitacionesSupabase(cliente)}
      imagenes={{ almacen: new AlmacenSupabase(cliente), reducir: reducirImagen }}
    />
  )
}

iniciar().then(
  (vista) =>
    raiz.render(
      <StrictMode>
        {vista}
        <ActualizacionPwa />
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error)
    raiz.render(<p role="alert">No se pudo iniciar la aplicación.</p>)
  },
)
