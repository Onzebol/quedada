import { Plus } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { useState } from 'react'
import { contarSinAsignar, filtrarProductos, type Filtro } from '../dominio/filtros'
import {
  anadirGrupo,
  anadirParticipante,
  anadirProducto,
  borrarGrupo,
  borrarProducto,
  cambiarReparto,
  editarProducto,
  renombrarGrupo,
} from '../dominio/operaciones'
import { totalAsistentes } from '../dominio/asistentes'
import type { Id } from '../dominio/tipos'
import './compra.css'
import { GrupoCompra } from './GrupoCompra'
import type { EstadoQuedada } from './useQuedada'

interface Props {
  estado: EstadoQuedada
  crearId: () => Id
}

function resumen(sinAsignar: number, total: number): string {
  if (total === 0) return 'No hay productos todavía'
  if (sinAsignar === 0) return 'Todos los productos tienen comprador'
  return `${sinAsignar} ${sinAsignar === 1 ? 'producto' : 'productos'} sin comprador`
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
  const [participante, setParticipante] = useState('')
  const [comida, setComida] = useState('')

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

  const filtro = aFiltro(valorFiltro)
  const filtrando = filtro.tipo !== 'todos'
  const grupos = [...quedada.grupos].sort((a, b) => a.orden - b.orden)

  return (
    <div className="compra">
      <h2>Lista de la compra</h2>
      <p role="status" className="compra__resumen">
        {resumen(contarSinAsignar(quedada.productos), quedada.productos.length)}
      </p>
      <p className="compra__resumen">
        Vienen {totalAsistentes(quedada)} {totalAsistentes(quedada) === 1 ? 'persona' : 'personas'}
      </p>

      {error === 'guardado' && (
        <p role="alert">No se pudo guardar el último cambio. Se ve en pantalla, pero se perderá al recargar.</p>
      )}

      <div className="compra__herramientas">
        <label>
          Mostrar
          <select value={valorFiltro} onChange={(e) => setValorFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="sinAsignar">Sin asignar</option>
            <option value="pendientes">Pendientes</option>
            {quedada.participantes.map((p) => (
              <option key={p.id} value={`comprador:${p.id}`}>
                Compra {p.nombre}
              </option>
            ))}
          </select>
        </label>

        <form
          aria-label="Participantes"
          onSubmit={(e) => {
            e.preventDefault()
            aplicar((q) => anadirParticipante(q, { id: crearId(), nombre: participante }))
            setParticipante('')
          }}
        >
          <label>
            Nombre del participante
            <input type="text" value={participante} onChange={(e) => setParticipante(e.target.value)} />
          </label>
          <button type="submit"><ConIcono icono={Plus}>Añadir participante</ConIcono></button>
        </form>
      </div>

      {grupos.map((grupo) => {
        const delGrupo = quedada.productos.filter((p) => p.grupoId === grupo.id)
        const visibles = filtrarProductos(delGrupo, filtro)
        if (filtrando && visibles.length === 0) return null
        return (
          <GrupoCompra
            key={grupo.id}
            grupo={grupo}
            productos={visibles}
            total={delGrupo.length}
            participantes={quedada.participantes}
            onAnadirProducto={(grupoId, nombre) => aplicar((q) => anadirProducto(q, { id: crearId(), grupoId, nombre }))}
            onCambiarProducto={(id, cambios) => aplicar((q) => editarProducto(q, id, cambios))}
            onBorrarProducto={(id) => aplicar((q) => borrarProducto(q, id))}
            onRenombrar={(id, nombre) => aplicar((q) => renombrarGrupo(q, id, nombre))}
            onBorrar={(id) => aplicar((q) => borrarGrupo(q, id))}
            onCambiarReparto={(id, reparto) => aplicar((q) => cambiarReparto(q, id, reparto))}
          />
        )
      })}

      <form
        className="compra__nueva-comida"
        aria-label="Nueva comida"
        onSubmit={(e) => {
          e.preventDefault()
          aplicar((q) => anadirGrupo(q, { id: crearId(), nombre: comida }))
          setComida('')
        }}
      >
        <label>
          Nombre de la comida
          <input type="text" value={comida} onChange={(e) => setComida(e.target.value)} />
        </label>
        <button type="submit"><ConIcono icono={Plus}>Añadir comida</ConIcono></button>
      </form>
    </div>
  )
}
