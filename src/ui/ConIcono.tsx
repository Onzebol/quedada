import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import './icono.css'

interface Props {
  icono: LucideIcon
  children: ReactNode
}

/**
 * Contenido de un botón con icono (lucide). El texto sigue en el DOM, así que el nombre accesible no
 * cambia; en pantallas estrechas `icono.css` lo oculta visualmente y solo queda el icono.
 */
export function ConIcono({ icono: Icono, children }: Props) {
  return (
    <>
      <Icono aria-hidden="true" size={18} strokeWidth={2} className="icono" />
      <span className="icono-texto">{children}</span>
    </>
  )
}
