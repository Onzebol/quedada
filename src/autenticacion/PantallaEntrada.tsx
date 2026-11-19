import { useEffect, useRef, useState } from 'react'
import { LogIn } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { guardarEnlacePendiente } from './enlacePendiente'
import type { Autenticacion } from './tipos'
import './sesion.css'
import { useSesion } from './useSesion'

/** Lo único que se ve sin sesión: hay que entrar con Google para usar la app. */
export function PantallaEntrada({ autenticacion, alEntrar = () => location.reload() }: { autenticacion: Autenticacion; alEntrar?: () => void }) {
  const { error, entrar, disponible } = useSesion(autenticacion)
  const contenedor = useRef<HTMLDivElement>(null)
  const [fallo, setFallo] = useState(false)
  const conBotonGoogle = autenticacion.montarBoton !== undefined

  useEffect(() => {
    if (!conBotonGoogle || !contenedor.current) return
    // Sin redirección el hash (invitación o quedada) se conserva: basta con recargar con la sesión abierta.
    void Promise.resolve(autenticacion.montarBoton!(contenedor.current, alEntrar, () => setFallo(true))).catch(() => setFallo(true))
  }, [autenticacion, conBotonGoogle, alEntrar])

  return (
    <main className="pagina entrada">
      <h1>Quedada</h1>
      {disponible && conBotonGoogle ? (
        <div ref={contenedor} className="entrada__google" />
      ) : disponible ? (
        <button type="button" className="con-texto" onClick={() => {
            // La redirección a Google pierde el hash: se recuerda el enlace abierto (invitación o quedada).
            guardarEnlacePendiente(window.location.hash)
            void entrar()
          }}>
          <ConIcono icono={LogIn}>Entrar con Google</ConIcono>
        </button>
      ) : (
        <p role="alert">Falta la configuración de Supabase: no se puede iniciar sesión.</p>
      )}
      {(error === 'entrada' || fallo) && <p role="alert">No se pudo iniciar sesión con Google. Inténtalo de nuevo.</p>}
    </main>
  )
}
