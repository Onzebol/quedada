import { Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import type { AlmacenImagenes } from './almacenImagenes'
import './tiques.css'

interface Props {
  almacen: AlmacenImagenes
  ruta: string
  concepto: string
}

/** Dirección temporal de la imagen; `null` mientras carga y `false` si no se pudo obtener. Quien la usa pone `key` con la ruta, así que cada imagen empieza de cero. */
function useUrl(almacen: AlmacenImagenes, ruta: string) {
  const [url, setUrl] = useState<string | null | false>(null)
  useEffect(() => {
    let vigente = true
    almacen.url(ruta).then(
      (u) => vigente && setUrl(u),
      () => vigente && setUrl(false),
    )
    return () => {
      vigente = false
    }
  }, [almacen, ruta])
  return url
}

/** Botón con la miniatura del tique que, al pulsarlo, abre la foto grande en una ventana. */
export function MiniaturaTique({ almacen, ruta, concepto }: Props) {
  const url = useUrl(almacen, ruta)
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button type="button" className="tique__miniatura" aria-label={`Ver tique de ${concepto}`} onClick={() => setAbierta(true)}>
        {url ? <img src={url} alt="" loading="lazy" /> : <Receipt aria-hidden="true" />}
      </button>
      {abierta && (
        <Modal titulo={`Tique: ${concepto}`} onCerrar={() => setAbierta(false)}>
          {url ? (
            <img className="tique__grande" src={url} alt={`Tique de ${concepto}`} />
          ) : (
            <p role={url === false ? 'alert' : 'status'}>{url === false ? 'No se pudo cargar la foto del tique.' : 'Cargando la foto…'}</p>
          )}
        </Modal>
      )}
    </>
  )
}
