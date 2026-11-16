import { useCallback, useEffect, useState } from 'react'
import type { Id } from '../dominio/tipos'
import { hashQuedada, quedadaDeHash } from './ruta'

/** Id de la quedada de la URL (`#/<id>`), sincronizado con el hash en ambos sentidos. */
export function useHashQuedada(): [Id | null, (id: Id | null) => void] {
  const [id, setId] = useState<Id | null>(() => quedadaDeHash(window.location.hash))

  useEffect(() => {
    const alCambiar = () => setId(quedadaDeHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  const cambiar = useCallback((nuevo: Id | null) => {
    setId(nuevo)
    window.location.hash = nuevo === null ? '' : hashQuedada(nuevo)
  }, [])

  return [id, cambiar]
}
