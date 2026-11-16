import { useCallback, useEffect, useMemo, useState } from 'react'
import { CopiarEnlace } from './autenticacion/CopiarEnlace'
import { AutenticacionGoogle } from './autenticacion/autenticacionGoogle'
import { Sesion } from './autenticacion/Sesion'
import type { Autenticacion } from './autenticacion/tipos'
import { useHashQuedada } from './autenticacion/useHashQuedada'
import { useSesion } from './autenticacion/useSesion'
import { Asistentes } from './asistentes/Asistentes'
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
  autenticacion?: Autenticacion
  /** URL de la página para construir el enlace de la quedada (por defecto, la actual). */
  urlPagina?: string
}

export default function App({ repositorio, crearId = () => crypto.randomUUID(), leerExcel = leerExcelReal, autenticacion, urlPagina }: Props) {
  const almacen = useMemo(() => repositorio ?? new RepositorioLocalStorage(), [repositorio])
  const [quedadas, setQuedadas] = useState<Quedada[]>([])
  const [activa, setActiva] = useHashQuedada()
  const auth = useMemo(() => autenticacion ?? new AutenticacionGoogle(), [autenticacion])
  const sesion = useSesion(auth)
  const estado = useQuedada(almacen, crearId, activa)

  const refrescar = useCallback(async () => {
    try {
      setQuedadas(await almacen.listar())
    } catch {
      // Si el almacenamiento falla, la lista ya lo comunica; aquí solo no hay selector.
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
    <main className="pagina">
      <h1>Quedada</h1>
      <Sesion sesion={sesion} quedada={estado.quedada} aplicar={estado.aplicar} />
      {activa !== null && quedadas.length > 0 && !quedadas.some((q) => q.id === activa) && (
        <p role="note">
          Esta quedada no está guardada en este navegador (los datos aún no se comparten entre personas), así
          que se muestra otra.
        </p>
      )}
      {quedadas.length > 1 && (
        <label className="selector-quedada">
          Quedada
          <select value={estado.quedada?.id ?? activa ?? quedadas[0].id} onChange={(e) => setActiva(e.target.value)}>
            {quedadas.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {estado.quedada !== null && <CopiarEnlace quedadaId={estado.quedada.id} urlPagina={urlPagina} />}
      <div className="pagina__columnas">
        <ListaCompra key={estado.quedada?.id ?? 'cargando'} estado={estado} crearId={crearId} />
        {estado.quedada !== null && <Cuentas quedada={estado.quedada} aplicar={estado.aplicar} />}
      </div>
      {estado.quedada !== null && (
        <Asistentes key={estado.quedada.id} quedada={estado.quedada} aplicar={estado.aplicar} crearId={crearId} />
      )}
      <ImportarExcel
        leer={leerExcel}
        repositorio={almacen}
        espacio={sesion.usuario?.id}
        onImportado={(ids) => {
          setActiva(ids[0] ?? null)
          void refrescar()
        }}
      />
    </main>
  )
}
