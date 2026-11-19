import { useCallback, useEffect, useMemo, useState } from 'react'
import { AutenticacionGoogle } from './autenticacion/autenticacionGoogle'
import { Sesion } from './autenticacion/Sesion'
import type { Autenticacion } from './autenticacion/tipos'
import { useHashInvitacion } from './autenticacion/useHashInvitacion'
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
import { duplicarQuedada, quedadaInicial } from './dominio/operaciones'
import type { Id, Quedada } from './dominio/tipos'
import { MisCosas } from './ui/MisCosas'
import { Pestanas } from './ui/Pestanas'
import { idsMios } from './dominio/vinculos'
import { Inicio, type DatosQuedada } from './inicio/Inicio'
import './inicio/inicio.css'
import { Compartir } from './invitaciones/Compartir'
import type { Invitaciones } from './invitaciones/tipos'
import { Unirse } from './invitaciones/Unirse'
import type { Imagenes } from './tiques/almacenImagenes'
import './index.css'

interface Props {
  repositorio?: Repositorio
  crearId?: () => Id
  autenticacion?: Autenticacion
  /** URL de la página para construir el enlace de la quedada (por defecto, la actual). */
  urlPagina?: string
  /** Se llama tras cerrar sesión (la raíz vuelve a la pantalla de entrada). */
  alSalir?: () => void
  /** Busca coordenadas de la dirección de la casa (por defecto, Nominatim); inyectable para los tests. */
  geocodificar?: Geocodificador
  /** Dónde guardar las fotos de los tiques; sin ello (modo local) no se ofrece la foto. */
  imagenes?: Imagenes
  /** Invitar por enlace y unirse; sin ello (modo local) no hay invitaciones. */
  invitaciones?: Invitaciones
}

export default function App({ repositorio, crearId = () => crypto.randomUUID(), autenticacion, urlPagina, alSalir, geocodificar, imagenes, invitaciones }: Props) {
  const almacen = useMemo(() => repositorio ?? new RepositorioLocalStorage(), [repositorio])
  const [activa, setActiva] = useHashQuedada()
  const token = useHashInvitacion()
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
    <main className={activa === null ? 'pagina pagina--inicio' : 'pagina'}>
      <h1>
        <button type="button" className="logo" onClick={() => setActiva(null)}>
          Quedada
        </button>
      </h1>
      {token !== null && invitaciones !== undefined && sesion.usuario !== null ? (
        <Unirse
          token={token}
          nombre={sesion.usuario.nombre}
          invitaciones={invitaciones}
          alUnirse={setActiva}
          alCancelar={() => setActiva(null)}
        />
      ) : activa === null ? (
        <PaginaInicial
          almacen={almacen}
          crearId={crearId}
          sesion={sesion}
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
          imagenes={imagenes}
          invitaciones={invitaciones}
        />
      )}
    </main>
  )
}

interface PropsInicial {
  almacen: Repositorio
  crearId: () => Id
  sesion: ReturnType<typeof useSesion>
  abrir: (id: Id) => void
}

/** Página inicial: lista de quedadas para elegir, crear o eliminar. */
function PaginaInicial({ almacen, crearId, sesion, abrir }: PropsInicial) {
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
    async ({ nombre, inicio, fin }: DatosQuedada) => {
      const nueva = { ...quedadaInicial(crearId, nombre), inicio, fin }
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

  const duplicar = useCallback(
    async (id: Id) => {
      try {
        const q = await almacen.obtener(id)
        if (!q) return
        const copia = duplicarQuedada(q, crearId)
        await almacen.guardar(copia)
        abrir(copia.id)
      } catch {
        setError(true)
      }
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

  const editar = useCallback(
    async (id: Id, datos: DatosQuedada) => {
      try {
        const q = await almacen.obtener(id)
        if (q) await almacen.guardar({ ...q, ...datos })
        await refrescar()
      } catch {
        setError(true)
      }
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
        <Inicio quedadas={quedadas} alElegir={abrir} alCrear={(d) => void crear(d)} alEliminar={eliminar} alEditar={(id, d) => void editar(id, d)} alDuplicar={(id) => void duplicar(id)} puedeEliminar={almacen.puedeBorrar?.bind(almacen)} />
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
  imagenes?: Imagenes
  invitaciones?: Invitaciones
}

function VistaQuedada({ almacen, crearId, sesion, quedadaId, urlPagina, geocodificar, imagenes, invitaciones }: PropsVista) {
  const estado = useQuedada(almacen, crearId, quedadaId)
  const mios = useMemo(
    () => (estado.quedada === null ? new Set<Id>() : idsMios(estado.quedada, sesion.usuario?.id ?? null)),
    [estado.quedada, sesion.usuario],
  )

  return (
    <MisCosas.Provider value={mios}>
      <div className="barra">
        <Sesion sesion={sesion} quedada={estado.quedada} aplicar={estado.aplicar} />
        {estado.quedada !== null && estado.error !== 'noEncontrada' && invitaciones !== undefined && (almacen.puedeBorrar?.(quedadaId) ?? true) && (
          <Compartir quedadaId={estado.quedada.id} invitaciones={invitaciones} urlPagina={urlPagina} />
        )}
      </div>
      {estado.quedada !== null && estado.error !== 'noEncontrada' && <h2 className="quedada__nombre">{estado.quedada.nombre}</h2>}
      {estado.error === 'noEncontrada' ? (
        <p role="note">
          No se encontró esta quedada: puede que no exista o que no tengas acceso. Los enlaces solo funcionan
          para quien ya participa en ella.
        </p>
      ) : (
        <>
          {estado.quedada === null ? (
            <ListaCompra estado={estado} crearId={crearId} />
          ) : (
            <Pestanas
              etiqueta="Secciones de la quedada"
              inicial="casa"
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
                  contenido: <Pagos quedada={estado.quedada} aplicar={estado.aplicar} crearId={crearId} imagenes={imagenes} />,
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
    </MisCosas.Provider>
  )
}
