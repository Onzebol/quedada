import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListaCompra } from './compra/ListaCompra'
import { useQuedada } from './compra/useQuedada'
import { Cuentas } from './cuentas/Cuentas'
import type { Repositorio } from './dominio/repositorio'
import { RepositorioLocalStorage } from './dominio/repositorioLocalStorage'
import type { Id, Quedada } from './dominio/tipos'
import { ImportarExcel } from './importacion/ImportarExcel'
import type { InformeImportacion } from './importacion/importarHoja'
import { leerExcel as leerExcelReal } from './importacion/leerExcel'
import './index.css'

interface Props {
  repositorio?: Repositorio
  crearId?: () => Id
  leerExcel?: (archivo: Blob) => Promise<InformeImportacion>
}

export default function App({ repositorio, crearId = () => crypto.randomUUID(), leerExcel = leerExcelReal }: Props) {
  const almacen = useMemo(() => repositorio ?? new RepositorioLocalStorage(), [repositorio])
<<<<<<< HEAD
  const estado = useQuedada(almacen, crearId)
  return (
    <main>
      <h1>Quedada</h1>
      <ListaCompra estado={estado} crearId={crearId} />
      {estado.quedada !== null && <Cuentas quedada={estado.quedada} aplicar={estado.aplicar} />}
=======
  const [quedadas, setQuedadas] = useState<Quedada[]>([])
  const [activa, setActiva] = useState<Id | null>(null)

  const refrescar = useCallback(async () => {
    try {
      setQuedadas(await almacen.listar())
    } catch {
      // Si el almacenamiento falla, ListaCompra ya lo comunica; aquí solo no hay selector.
    }
  }, [almacen])

  useEffect(() => {
    let activo = true
    almacen
      .listar()
      .then((guardadas) => {
        if (activo) setQuedadas(guardadas)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [almacen])

  return (
    <main>
      <h1>Quedada</h1>
      {quedadas.length > 1 && (
        <label className="selector-quedada">
          Quedada
          <select value={activa ?? quedadas[0].id} onChange={(e) => setActiva(e.target.value)}>
            {quedadas.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <ListaCompra key={activa ?? 'primera'} repositorio={almacen} crearId={crearId} quedadaId={activa} />
      <ImportarExcel
        leer={leerExcel}
        repositorio={almacen}
        onImportado={(ids) => {
          setActiva(ids[0] ?? null)
          void refrescar()
        }}
      />
>>>>>>> 2aee2db (Hito 6: importar el Excel de compras)
    </main>
  )
}
