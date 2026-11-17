import { useCallback, useEffect, useState } from 'react'

/** Evento no estándar (Chrome, Edge, Android) con el que el navegador ofrece instalar la aplicación. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function yaInstalada(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Permite instalar la aplicación desde un botón propio. `puedeInstalar` solo es verdadero cuando el
 * navegador lo ofrece y la aplicación no está ya abierta como instalada. Un evento solo sirve una vez:
 * tras usarlo (se acepte o no) el botón desaparece.
 */
export function useInstalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)

  useEffect(() => {
    if (yaInstalada()) return
    const alOfrecer = (e: Event) => {
      e.preventDefault() // sin el mini aviso del navegador: la oferta es nuestro botón
      setEvento(e as EventoInstalacion)
    }
    const alInstalar = () => setEvento(null)
    window.addEventListener('beforeinstallprompt', alOfrecer)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!evento) return
    setEvento(null)
    await evento.prompt()
    await evento.userChoice
  }, [evento])

  return { puedeInstalar: evento !== null, instalar }
}
