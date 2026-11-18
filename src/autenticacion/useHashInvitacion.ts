import { useEffect, useState } from 'react'
import { invitacionDeHash } from './ruta'

/** Token de la invitación de la URL (`#/unirse/<token>`), o `null`; se actualiza al cambiar el hash. */
export function useHashInvitacion(): string | null {
  const [token, setToken] = useState<string | null>(() => invitacionDeHash(window.location.hash))

  useEffect(() => {
    const alCambiar = () => setToken(invitacionDeHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  return token
}
