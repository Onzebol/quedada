import { vincularCuenta, participanteDe } from '../dominio/vinculos'
import type { Quedada } from '../dominio/tipos'
import './sesion.css'
import type { useSesion } from './useSesion'

interface Props {
  sesion: ReturnType<typeof useSesion>
  quedada: Quedada | null
  aplicar: (cambio: (q: Quedada) => Quedada) => void
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
          <div className="sesion__persona">
            {usuario.foto !== null && (
              <img src={usuario.foto} alt={`Foto de ${usuario.nombre}`} width={32} height={32} referrerPolicy="no-referrer" />
            )}
            <span>{usuario.nombre}</span>
            <button type="button" onClick={() => void salir()}>
              Cerrar sesión
            </button>
          </div>
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
