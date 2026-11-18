import { Link, Link2Off, Plus, RefreshCw, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { enlaceInvitacion } from '../autenticacion/ruta'
import type { Id } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { ConIcono } from '../ui/ConIcono'
import type { Invitaciones, Miembro } from './tipos'
import './invitaciones.css'

interface Props {
  quedadaId: Id
  invitaciones: Invitaciones
  /** URL de la página para construir el enlace (por defecto, la actual). */
  urlPagina?: string
}

interface Estado {
  token: string | null
  miembros: Miembro[]
}

/**
 * Panel «Invitar» (solo para el propietario): el enlace de invitación (crear, copiar, sustituir o
 * desactivar) y quiénes han entrado con él (con «Retirar», que pide confirmación).
 */
export function Compartir({ quedadaId, invitaciones, urlPagina }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [error, setError] = useState(false)
  const [copiado, setCopiado] = useState<'no' | 'si' | 'error'>('no')
  const idPanel = useId()

  const cargar = useCallback(async () => {
    try {
      const [token, miembros] = await Promise.all([invitaciones.enlaceActivo(quedadaId), invitaciones.miembros(quedadaId)])
      setEstado({ token, miembros })
      setError(false)
    } catch {
      setError(true)
    }
  }, [invitaciones, quedadaId])

  useEffect(() => {
    if (!abierto) return
    // Se carga al abrir; el estado se rellena cuando llega la respuesta (asíncrona).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar()
  }, [abierto, cargar])

  async function cambiar(accion: () => Promise<unknown>) {
    try {
      await accion()
      setCopiado('no')
      await cargar()
    } catch {
      setError(true)
    }
  }

  const direccion = estado?.token ? enlaceInvitacion(urlPagina ?? window.location.href, estado.token) : null

  async function copiar() {
    if (direccion === null) return
    try {
      await navigator.clipboard.writeText(direccion)
      setCopiado('si')
    } catch {
      setCopiado('error')
    }
  }

  return (
    <div className="compartir">
      <button type="button" aria-expanded={abierto} aria-controls={idPanel} onClick={() => setAbierto(!abierto)}>
        <ConIcono icono={UserPlus}>Invitar</ConIcono>
      </button>
      {abierto && (
        <section id={idPanel} className="compartir__panel" aria-label="Invitar a la quedada">
          {error && <p role="alert">No se pudo cargar o cambiar la invitación. Inténtalo de nuevo.</p>}
          {estado !== null && (
            <>
              {direccion === null ? (
                <>
                  <p>No hay ningún enlace activo.</p>
                  <div className="compartir__acciones">
                    <button type="button" onClick={() => void cambiar(() => invitaciones.crearEnlace(quedadaId))}>
                      <ConIcono icono={Plus}>Crear enlace</ConIcono>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    Enlace de invitación
                    <input type="text" readOnly value={direccion} onFocus={(e) => e.currentTarget.select()} />
                  </label>
                  <p className="compartir__ayuda">Quien lo abra y entre con Google podrá ver y editar la quedada. Caduca a los 30 días.</p>
                  <div className="compartir__acciones">
                    <button type="button" onClick={() => void copiar()}>
                      <ConIcono icono={Link}>Copiar enlace</ConIcono>
                    </button>
                    <button type="button" onClick={() => void cambiar(() => invitaciones.crearEnlace(quedadaId))}>
                      <ConIcono icono={RefreshCw}>Crear enlace nuevo</ConIcono>
                    </button>
                    <button type="button" onClick={() => void cambiar(() => invitaciones.desactivarEnlace(quedadaId))}>
                      <ConIcono icono={Link2Off}>Desactivar enlace</ConIcono>
                    </button>
                  </div>
                  {copiado === 'si' && <span role="status">Enlace copiado</span>}
                  {copiado === 'error' && <span role="alert">No se pudo copiar el enlace</span>}
                </>
              )}
              <h3>Miembros</h3>
              {estado.miembros.length === 0 ? (
                <p>Todavía no ha entrado nadie.</p>
              ) : (
                <ul className="compartir__miembros" aria-label="Miembros">
                  {estado.miembros.map((m) => (
                    <li key={m.usuarioId}>
                      <span>{m.nombre || 'Sin nombre'}</span>
                      <BotonBorrar
                        texto="Retirar"
                        etiqueta={`Retirar a ${m.nombre || 'Sin nombre'}`}
                        titulo={`¿Retirar a ${m.nombre || 'este miembro'}?`}
                        mensaje="Dejará de ver la quedada."
                        textoConfirmar="Sí, retirar"
                        onConfirmar={() => cambiar(() => invitaciones.retirar(quedadaId, m.usuarioId))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
