import { useRegisterSW } from 'virtual:pwa-register/react'
import { AvisoActualizacion } from './AvisoActualizacion'

const CADA_HORA = 60 * 60 * 1000

/**
 * Registra el service worker (módulo virtual del plugin PWA) y avisa cuando hay una versión nueva.
 * Mientras la aplicación está abierta busca una versión nueva cada hora; «Actualizar» recarga con ella.
 */
export function ActualizacionPwa() {
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => void registro.update().catch(() => undefined), CADA_HORA)
    },
  })

  return (
    <AvisoActualizacion
      hayNueva={hayNueva}
      onActualizar={() => void updateServiceWorker(true)}
      onCerrar={() => setHayNueva(false)}
    />
  )
}
