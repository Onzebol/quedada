import { useEffect, useState } from 'react'
import type { Id } from '../dominio/tipos'
import type { Invitaciones } from './tipos'
import './invitaciones.css'

interface Props {
  token: string
  /** Nombre de la cuenta, que queda como nombre del miembro. */
  nombre: string
  invitaciones: Invitaciones
  /** Se llama con el id de la quedada cuando ya se ha entrado en ella. */
  alUnirse: (id: Id) => void
  alCancelar: () => void
}

type Estado = { fase: 'cargando' } | { fase: 'lista'; quedada: string } | { fase: 'invalida' }

/** Pantalla de `#/unirse/<token>`: «Te han invitado a…» con «Unirme». */
export function Unirse({ token, nombre, invitaciones, alUnirse, alCancelar }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true
    invitaciones.nombreDe(token).then(
      (quedada) => {
        if (activo) setEstado(quedada === null ? { fase: 'invalida' } : { fase: 'lista', quedada })
      },
      () => {
        if (activo) setEstado({ fase: 'invalida' })
      },
    )
    return () => {
      activo = false
    }
  }, [invitaciones, token])

  async function unirse() {
    setOcupado(true)
    setError(false)
    try {
      alUnirse(await invitaciones.aceptar(token, nombre))
    } catch {
      setError(true)
      setOcupado(false)
    }
  }

  if (estado.fase === 'cargando') return <p role="status">Cargando…</p>

  if (estado.fase === 'invalida') {
    return (
      <section className="unirse">
        <p role="alert">La invitación no es válida o ha caducado. Pide un enlace nuevo a quien te invitó.</p>
        <div className="unirse__acciones">
          <button type="button" onClick={alCancelar}>
            Volver al inicio
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="unirse">
      <h2>Te han invitado a «{estado.quedada}»</h2>
      <p>Al unirte verás la quedada y podrás marcar lo que compras, lo que has gastado y lo que has pagado.</p>
      {error && <p role="alert">No se pudo entrar en la quedada. Inténtalo de nuevo.</p>}
      <div className="unirse__acciones">
        <button type="button" className="modal__boton" onClick={alCancelar} disabled={ocupado}>
          Ahora no
        </button>
        <button type="submit" disabled={ocupado} onClick={() => void unirse()}>
          Unirme
        </button>
      </div>
    </section>
  )
}
