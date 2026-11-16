import { useMemo } from 'react'
import { ListaCompra } from './compra/ListaCompra'
import type { Repositorio } from './dominio/repositorio'
import { RepositorioLocalStorage } from './dominio/repositorioLocalStorage'
import type { Id } from './dominio/tipos'
import './index.css'

interface Props {
  repositorio?: Repositorio
  crearId?: () => Id
}

export default function App({ repositorio, crearId = () => crypto.randomUUID() }: Props) {
  const almacen = useMemo(() => repositorio ?? new RepositorioLocalStorage(), [repositorio])
  return (
    <main>
      <h1>Quedada</h1>
      <ListaCompra repositorio={almacen} crearId={crearId} />
    </main>
  )
}
