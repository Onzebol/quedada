import { LogIn } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import type { Autenticacion } from './tipos'
import './sesion.css'
import { useSesion } from './useSesion'

/** Lo único que se ve sin sesión: hay que entrar con Google para usar la app. */
export function PantallaEntrada({ autenticacion }: { autenticacion: Autenticacion }) {
  const { error, entrar, disponible } = useSesion(autenticacion)

  return (
    <main className="pagina entrada">
      <h1>Quedada</h1>
      {disponible ? (
        <button type="button" className="con-texto" onClick={() => void entrar()}>
          <ConIcono icono={LogIn}>Entrar con Google</ConIcono>
        </button>
      ) : (
        <p role="alert">Falta la configuración de Supabase: no se puede iniciar sesión.</p>
      )}
      {error === 'entrada' && <p role="alert">No se pudo iniciar sesión con Google. Inténtalo de nuevo.</p>}
    </main>
  )
}
