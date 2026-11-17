import { Download } from 'lucide-react'
import { useState } from 'react'
import { ConIcono } from '../ui/ConIcono'
import { Modal } from '../ui/Modal'
import './instalar.css'
import { useInstalar } from './useInstalar'

/**
 * Botón «Instalar»: con el navegador que permite instalar, abre su diálogo; en iOS, que no lo permite,
 * abre una ventana con los pasos a mano. En cualquier otro caso (o ya instalada) no sale.
 */
export function BotonInstalar() {
  const { puedeInstalar, instalar, pistaIos } = useInstalar()
  const [verPasos, setVerPasos] = useState(false)
  if (!puedeInstalar && !pistaIos) return null
  return (
    <>
      <button
        type="button"
        className="boton-instalar"
        onClick={() => (puedeInstalar ? void instalar() : setVerPasos(true))}
      >
        <ConIcono icono={Download}>Instalar</ConIcono>
      </button>
      {verPasos && (
        <Modal titulo="Instalar en iOS" onCerrar={() => setVerPasos(false)}>
          <ol className="boton-instalar__pasos">
            <li>Toca el botón «Compartir» de la barra de Safari.</li>
            <li>Elige «Añadir a pantalla de inicio».</li>
            <li>Pulsa «Añadir».</li>
          </ol>
          <div className="modal__acciones">
            <button type="button" data-autofocus onClick={() => setVerPasos(false)}>
              Entendido
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
