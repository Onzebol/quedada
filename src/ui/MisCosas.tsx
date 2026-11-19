import { createContext, useContext } from 'react'
import type { Id } from '../dominio/tipos'

/** Ids de lo que es mío (mi persona, mi familia y sus componentes), por «Este soy yo». */
export const MisCosas = createContext<ReadonlySet<Id>>(new Set())

/** Atributo para resaltar algo mío: `<li {...marcaMio(mios, id)}>`. Sin ser mío no añade nada. */
export function marcaMio(mios: ReadonlySet<Id>, ...ids: (Id | null | undefined)[]): { 'data-mio'?: true } {
  return ids.some((id) => id != null && mios.has(id)) ? { 'data-mio': true } : {}
}

/** Lo mismo con el contexto, para componentes que pintan un solo elemento. */
export function useMio(...ids: (Id | null | undefined)[]): { 'data-mio'?: true } {
  return marcaMio(useContext(MisCosas), ...ids)
}
