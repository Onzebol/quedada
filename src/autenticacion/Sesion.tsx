import { useEffect, useRef, useState } from 'react'
import { vincularCuenta, participanteDe } from '../dominio/vinculos'
import type { Quedada } from '../dominio/tipos'
import './sesion.css'
import type { useSesion } from './useSesion'

interface Props {
  sesion: ReturnType<typeof useSesion>
  quedada: Quedada | null
  aplicar: (cambio: (q: Quedada) => Quedada) => void
}

function MenuUsuario({ nombre, foto, salir }: { nombre: string; foto: string | null; salir: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false)
    }
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alPulsar)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alPulsar)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  return (
    <div className="sesion__persona" ref={raiz}>
      <button type="button" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span>{nombre}</span>
        {foto !== null && <img src={foto} alt="" width={32} height={32} referrerPolicy="no-referrer" />}
      </button>
      {abierto && (
        <div className="sesion__menu" role="menu">
          <button type="button" role="menuitem" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export function Sesion({ sesion, quedada, aplicar }: Props) {
  const { usuario, error, entrar, salir, disponible } = sesion
  if (!disponible && usuario === null) return null

  const yo = usuario !== null && quedada !== null ? participanteDe(quedada, usuario.id) : null

  return (
    <section className="sesion" aria-label="Sesión">
      {usuario === null ? (
        <button type="button" onClick={() => void entrar()}>
          Entrar con Google
        </button>
      ) : (
        <>
          <MenuUsuario nombre={usuario.nombrePila ?? usuario.nombre.trim().split(/\s+/)[0]} foto={usuario.foto} salir={() => void salir()} />
          {quedada !== null && quedada.participantes.length > 0 && (
            <label>
              Este soy yo
              <select
                value={yo?.id ?? ''}
                onChange={(e) => aplicar((q) => vincularCuenta(q, e.target.value === '' ? null : e.target.value, usuario.id))}
              >
                <option value="">Nadie</option>
                {quedada.participantes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          {yo !== null && <p>Eres {yo.nombre} en esta quedada</p>}
        </>
      )}
      {error === 'entrada' && <p role="alert">No se pudo iniciar sesión con Google. Inténtalo de nuevo.</p>}
    </section>
  )
}
