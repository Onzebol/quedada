import { useCallback, useState } from 'react'
import type { Autenticacion, Usuario } from './tipos'

/** Estado de la sesión de `auth`: quién ha entrado y las acciones de entrar y salir. */
export function useSesion(auth: Autenticacion) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => auth.actual())
  const [error, setError] = useState<'entrada' | null>(null)

  const entrar = useCallback(async () => {
    setError(null)
    try {
      setUsuario(await auth.entrar())
    } catch {
      setError('entrada')
    }
  }, [auth])

  const salir = useCallback(async () => {
    await auth.salir()
    setUsuario(null)
    setError(null)
  }, [auth])

  return { usuario, error, entrar, salir, disponible: auth.disponible() }
}
