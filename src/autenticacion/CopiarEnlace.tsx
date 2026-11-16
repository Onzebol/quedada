import { useState } from 'react'
import { enlaceQuedada } from './ruta'

interface Props {
  quedadaId: string
  urlPagina?: string
}

export function CopiarEnlace({ quedadaId, urlPagina }: Props) {
  const [estado, setEstado] = useState<'espera' | 'copiado' | 'error'>('espera')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlaceQuedada(urlPagina ?? window.location.href, quedadaId))
      setEstado('copiado')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div className="copiar-enlace">
      <button type="button" onClick={() => void copiar()}>
        Copiar enlace
      </button>
      {estado === 'copiado' && <span role="status">Enlace copiado</span>}
      {estado === 'error' && <span role="alert">No se pudo copiar el enlace</span>}
    </div>
  )
}
