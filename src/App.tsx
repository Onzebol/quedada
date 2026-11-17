import { ArrowLeft } from 'lucide-react'
import { ConIcono } from './ui/ConIcono'
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
import { DatosCasa } from './casa/DatosCasa'
import type { Geocodificador } from './casa/mapa'
import { Pagos } from './casa/Pagos'
import { Cuentas } from './cuentas/Cuentas'
import type { Repositorio } from './dominio/repositorio'
import { RepositorioLocalStorage } from './dominio/repositorioLocalStorage'
import { quedadaInicial } from './dominio/operaciones'
import type { Id, Quedada } from './dominio/tipos'
import { Pestanas } from './ui/Pestanas'
import { Inicio } from './inicio/Inicio'
import { ImportarExcel } from './importacion/ImportarExcel'
import type { InformeImportacion } from './importacion/importarHoja'
import { leerExcel as leerExcelReal } from './importacion/leerExcel'
import './inicio/inicio.css'
import './index.css'

interface Props {
  repositorio?: Repositorio
  crearId?: () => Id
  leerExcel?: (archivo: Blob) => Promise<InformeImportacion>
  autenticacion?: Autenticacion
  /** URL de la página para construir el enlace de la quedada (por defecto, la actual). */
  urlPagina?: string
  /** Se llama tras cerrar sesión (la raíz vuelve a la pantalla de entrada). */
  alSalir?: () => void
  /** Busca coordenadas de la dirección de la casa (por defecto, Nominatim); inyectable para los tests. */
  geocodificar?: Geocodificador
}

export default function App({ repositorio, crearId = () => crypto.randomUUID(), leerExcel = leerExcelReal, autenticacion, urlPagina, alSalir, geocodificar }: Props) {
  const almacen = useMemo(() => repositorio ?? new RepositorioLocalStorage(), [repositorio])
  const [activa, setActiva] = useHashQuedada()
  const auth = useMemo(() => autenticacion ?? new AutenticacionGoogle(), [autenticacion])
  const sesionBase = useSesion(auth)
  const sesion = useMemo(
    () => ({
      ...sesionBase,
      salir: async () => {
        await sesionBase.salir()
        alSalir?.()
      },
    }),
    [sesionBase, alSalir],
  )

  return (
    <main className="pagina">
      <h1>Quedada</h1>
      {activa === null ? (
        <PaginaInicial
          almacen={almacen}
          crearId={crearId}
          leerExcel={leerExcel}
          sesion={sesion}
          espacio={sesion.usuario?.id}
          abrir={setActiva}
        />
      ) : (
        <VistaQuedada
          key={activa}
          almacen={almacen}
          crearId={crearId}
          sesion={sesion}
          quedadaId={activa}
          urlPagina={urlPagina}
          geocodificar={geocodificar}
          irAlInicio={() => setActiva(null)}
        />
      )}
    </main>
  )
}

interface PropsInicial {
  almacen: Repositorio
  crearId: () => Id
  leerExcel: (archivo: Blob) => Promise<InformeImportacion>
  sesion: ReturnType<typeof useSesion>
  espacio?: string
  abrir: (id: Id) => void
}

/** Página inicial: lista de quedadas para elegir, crear o eliminar (y la importación del Excel). */
function PaginaInicial({ almacen, crearId, leerExcel, sesion, espacio, abrir }: PropsInicial) {
  const [quedadas, setQuedadas] = useState<Quedada[] | null>(null)
  const [error, setError] = useState(false)

  const refrescar = useCallback(async () => {
    try {
      setQuedadas(await almacen.listar())
      setError(false)
    } catch {
      setError(true)
    }
  }, [almacen])

  useEffect(() => {
    let activo = true
    almacen
      .listar()
      .then((guardadas) => {
        if (activo) setQuedadas(guardadas)
      })
      .catch(() => {
        if (activo) setError(true)
      })
    return () => {
      activo = false
    }
  }, [almacen])

  const crear = useCallback(
    async (nombre: string) => {
      const nueva = quedadaInicial(crearId, nombre)
      try {
        await almacen.guardar(nueva)
      } catch {
        setError(true)
        return
      }
      abrir(nueva.id)
    },
    [almacen, crearId, abrir],
  )

  const eliminar = useCallback(
    async (id: Id) => {
      await almacen.borrar(id)
      await refrescar()
    },
    [almacen, refrescar],
  )

  return (
    <>
      <Sesion sesion={sesion} quedada={null} aplicar={() => {}} />
      {error && <p role="alert">No se pudieron cargar o guardar las quedadas. Recarga la página e inténtalo de nuevo.</p>}
      {quedadas === null ? (
        !error && <p role="status">Cargando…</p>
      ) : (
        <Inicio quedadas={quedadas} alElegir={abrir} alCrear={(n) => void crear(n)} alEliminar={eliminar}>
          <ImportarExcel
            leer={leerExcel}
            repositorio={almacen}
            espacio={espacio}
            onImportado={(ids) => {
              if (ids.length === 1) abrir(ids[0])
              else void refrescar()
            }}
          />
        </Inicio>
      )}
    </>
  )
}

interface PropsVista {
  almacen: Repositorio
  crearId: () => Id
  sesion: ReturnType<typeof useSesion>
  quedadaId: Id
  urlPagina?: string
  geocodificar?: Geocodificador
  irAlInicio: () => void
}

function VistaQuedada({ almacen, crearId, sesion, quedadaId, urlPagina, geocodificar, irAlInicio }: PropsVista) {
  const estado = useQuedada(almacen, crearId, quedadaId)

  return (
    <>
      <nav>
        <button type="button" className="volver" onClick={irAlInicio}>
          <ConIcono icono={ArrowLeft}>Todas las quedadas</ConIcono>
        </button>
      </nav>
      <Sesion sesion={sesion} quedada={estado.quedada} aplicar={estado.aplicar} />
      {estado.error === 'noEncontrada' ? (
        <p role="note">
          No se encontró esta quedada: puede que no exista o que no tengas acceso. Los enlaces solo funcionan
          para quien ya participa en ella.
        </p>
      ) : (
        <>
          {estado.quedada !== null && <CopiarEnlace quedadaId={estado.quedada.id} urlPagina={urlPagina} />}
          {estado.quedada === null ? (
            <ListaCompra estado={estado} crearId={crearId} />
          ) : (
            <Pestanas
              etiqueta="Secciones de la quedada"
              inicial="compra"
              pestanas={[
                {
                  id: 'casa',
                  titulo: 'La casa',
                  contenido: (
                    <>
                      <DatosCasa quedada={estado.quedada} aplicar={estado.aplicar} geocodificar={geocodificar} />
                      <Asistentes quedada={estado.quedada} aplicar={estado.aplicar} crearId={crearId} />
                    </>
                  ),
                },
                { id: 'compra', titulo: 'Lista de la compra', contenido: <ListaCompra estado={estado} crearId={crearId} /> },
                {
                  id: 'pagos',
                  titulo: 'Pagos',
                  contenido: <Pagos quedada={estado.quedada} aplicar={estado.aplicar} />,
                },
                {
                  id: 'resumen',
                  titulo: 'Resumen',
                  contenido: <Cuentas quedada={estado.quedada} />,
                },
              ]}
            />
          )}
        </>
      )}
    </>
  )
}
