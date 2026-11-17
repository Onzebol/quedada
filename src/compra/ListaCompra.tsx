import { Plus } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import { useState } from 'react'
import { contarSinAsignar, filtrarProductos, type Filtro } from '../dominio/filtros'
import {
  anadirGrupo,
  anadirProducto,
  borrarGrupo,
  borrarProducto,
  editarProducto,
  renombrarGrupo,
} from '../dominio/operaciones'
import { compradores } from '../dominio/compradores'
import { ordenarPorNombre } from '../dominio/asistentes'
import type { Id } from '../dominio/tipos'
import './compra.css'
import { GrupoCompra } from './GrupoCompra'
import type { EstadoQuedada } from './useQuedada'

interface Props {
  estado: EstadoQuedada
  crearId: () => Id
}

function aFiltro(valor: string): Filtro {
  if (valor === 'sinAsignar') return { tipo: 'sinAsignar' }
  if (valor === 'pendientes') return { tipo: 'pendientes' }
  if (valor.startsWith('comprador:')) return { tipo: 'comprador', compradorId: valor.slice('comprador:'.length) }
  return { tipo: 'todos' }
}

export function ListaCompra({ estado, crearId }: Props) {
  const { quedada, aplicar, error } = estado
  const [valorFiltro, setValorFiltro] = useState('todos')
  const [anadiendo, setAnadiendo] = useState(false)

  if (quedada === null) {
    return error === 'carga' ? (
      <p role="alert">
        No se pudieron cargar los datos. Puede que el navegador bloquee el almacenamiento (por ejemplo en una
        ventana privada). Recarga la página o prueba en otra ventana.
      </p>
    ) : (
      <p role="status">Cargando…</p>
    )
  }

  const todosCompradores = compradores(quedada)
  // En «Mostrar» solo salen quienes tienen algo asignado; si el elegido se queda sin nada, vuelve a «Todos».
  const conCompras = todosCompradores.filter((c) => quedada.productos.some((p) => p.compradorId === c.id))
  const valorEfectivo =
    valorFiltro.startsWith('comprador:') && !conCompras.some((c) => `comprador:${c.id}` === valorFiltro)
      ? 'todos'
      : valorFiltro
  const filtro = aFiltro(valorEfectivo)
  const filtrando = filtro.tipo !== 'todos'
  const grupos = ordenarPorNombre(quedada.grupos, (g) => g.nombre)
  const totalProductos = quedada.productos.length
  const visibles = filtrarProductos(quedada.productos, filtro)
  const visiblesTotal = visibles.length
  // Con filtro, los totales cuentan solo lo filtrado.
  const porComprar = visibles.filter((p) => !p.comprado).length
  const sinComprador = contarSinAsignar(quedada.productos)

  return (
    <div className="compra">
      <div className="compra__cabecera">
        <h2>Lista de la compra</h2>
        {!filtrando && (
          <button type="button" onClick={() => setAnadiendo(true)}>
            <ConIcono icono={Plus}>Añadir sección</ConIcono>
          </button>
        )}
      </div>
      {error === 'guardado' && (
        <p role="alert">No se pudo guardar el último cambio. Se ve en pantalla, pero se perderá al recargar.</p>
      )}

      <div className="compra__herramientas">
        <label>
          Mostrar
          <select value={valorEfectivo} onChange={(e) => setValorFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="sinAsignar">Sin asignar</option>
            <option value="pendientes">Pendientes</option>
            {conCompras.map((p) => (
              <option key={p.id} value={`comprador:${p.id}`}>
                Compra {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="compra__datos" aria-label="Totales de la lista">
          <span>
            {filtrando ? `${visiblesTotal} de ${totalProductos}` : totalProductos}{' '}
            {totalProductos === 1 ? 'producto' : 'productos'}
          </span>
          {porComprar > 0 && <span>{porComprar} por comprar</span>}
          {!filtrando && sinComprador > 0 && <span>{sinComprador} sin comprador</span>}
        </p>
      </div>

      <div className="compra__grupos">
      {grupos.map((grupo) => {
        const delGrupo = ordenarPorNombre(
          quedada.productos.filter((p) => p.grupoId === grupo.id),
          (p) => p.nombre,
        )
        const visibles = filtrarProductos(delGrupo, filtro)
        return (
          <GrupoCompra
            key={grupo.id}
            grupo={grupo}
            productos={visibles}
            total={delGrupo.length}
            forzarAbierta={filtrando}
            conComprador={filtro.tipo !== 'comprador'}
            oculta={filtrando && visibles.length === 0}
            soloLectura={filtrando}
            compradores={todosCompradores}
            onAnadirProducto={(grupoId, valores) => {
              const id = crearId()
              aplicar((q) => editarProducto(anadirProducto(q, { id, grupoId, nombre: valores.nombre ?? '' }), id, valores))
            }}
            onCambiarProducto={(id, cambios) => aplicar((q) => editarProducto(q, id, cambios))}
            onBorrarProducto={(id) => aplicar((q) => borrarProducto(q, id))}
            onRenombrar={(id, nombre) => aplicar((q) => renombrarGrupo(q, id, nombre))}
            onBorrar={(id) => aplicar((q) => borrarGrupo(q, id))}
          />
        )
      })}
      </div>

      {anadiendo && (
        <NuevaSeccion
          alAnadir={(nombre) => aplicar((q) => anadirGrupo(q, { id: crearId(), nombre }))}
          onCerrar={() => setAnadiendo(false)}
        />
      )}
    </div>
  )
}

function NuevaSeccion({ alAnadir, onCerrar }: { alAnadir: (nombre: string) => void; onCerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  return (
    <FormularioModal titulo="Nueva sección" envio="Añadir" onEnviar={() => alAnadir(nombre)} onCerrar={onCerrar}>
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
