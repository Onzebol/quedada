import { Copy, Pencil, Plus } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import { useState, type ReactNode } from 'react'
import { EliminarQuedada } from '../compra/EliminarQuedada'
import { fechasValidas, ordenarQuedadas } from '../dominio/ordenQuedadas'
import type { Id, Quedada } from '../dominio/tipos'
import './inicio.css'

/** Lo que se pide al crear o editar una quedada: nombre y fechas (ISO AAAA-MM-DD, opcionales). */
export interface DatosQuedada {
  nombre: string
  inicio: string | null
  fin: string | null
}

interface Props {
  quedadas: Quedada[]
  alElegir: (id: Id) => void
  alCrear: (datos: DatosQuedada) => void
  /** Borra la quedada; debe rechazar si no se pudo. */
  alEliminar: (id: Id) => Promise<void>
  /** Cambia el nombre y las fechas de la quedada. */
  alEditar: (id: Id, datos: DatosQuedada) => void
  /** Crea una copia de la quedada (sin pagos ni asignaciones). */
  alDuplicar: (id: Id) => void
  /** Si la cuenta puede borrar esa quedada (las compartidas por otra persona no). Por defecto, todas. */
  puedeEliminar?: (id: Id) => boolean
  children?: ReactNode
}

const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return formatoFecha.format(new Date(a, m - 1, d)).replace(/\./g, '')
}

/** «4 dic 2026 – 6 dic 2026», o solo la que haya; vacío si no hay ninguna. */
function textoFechas({ inicio, fin }: Pick<Quedada, 'inicio' | 'fin'>): string {
  if (inicio && fin) return `${fechaLegible(inicio)} – ${fechaLegible(fin)}`
  if (inicio) return `Desde el ${fechaLegible(inicio)}`
  if (fin) return `Hasta el ${fechaLegible(fin)}`
  return ''
}

/** Ventana modal con los datos de una quedada (nombre y fechas): sirve para añadir una (vacía) y para editar una. */
function DatosDeQuedada({ titulo, envio, inicial, onGuardar, onCerrar }: {
  titulo: string
  envio: string
  inicial: DatosQuedada
  onGuardar: (datos: DatosQuedada) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(inicial.nombre)
  const [inicio, setInicio] = useState(inicial.inicio ?? '')
  const [fin, setFin] = useState(inicial.fin ?? '')
  return (
    <FormularioModal
      titulo={titulo}
      envio={envio}
      onEnviar={() => {
        const limpio = nombre.trim()
        const datos = { nombre: limpio, inicio: inicio || null, fin: fin || null }
        if (limpio !== '' && fechasValidas(datos.inicio, datos.fin)) onGuardar(datos)
      }}
      onCerrar={onCerrar}
    >
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} data-autofocus />
      </label>
      <label>
        Inicio
        <input
          type="date"
          value={inicio}
          onChange={(e) => {
            setInicio(e.target.value)
            if (e.target.value !== '' && fin !== '' && fin < e.target.value) setFin(e.target.value)
          }}
        />
      </label>
      <label>
        Fin
        <input type="date" value={fin} min={inicio || undefined} onChange={(e) => setFin(e.target.value)} />
      </label>
    </FormularioModal>
  )
}

/** Página inicial: elegir, añadir, editar o eliminar quedadas (añadir y editar, en ventanas modales). */
export function Inicio({ quedadas, alElegir, alCrear, alEliminar, alEditar, alDuplicar, puedeEliminar, children }: Props) {
  const [anadiendo, setAnadiendo] = useState(false)
  const [editando, setEditando] = useState<Quedada | null>(null)

  return (
    <section className="inicio" aria-label="Tus quedadas">
      <div className="inicio__cabecera">
        <h2>Tus quedadas</h2>
        <button type="button" onClick={() => setAnadiendo(true)}>
          <ConIcono icono={Plus}>Añadir quedada</ConIcono>
        </button>
      </div>
      {quedadas.length === 0 ? (
        <p>Todavía no tienes ninguna quedada.</p>
      ) : (
        <ul className="inicio__lista" aria-label="Quedadas">
          {ordenarQuedadas(quedadas).map((q) => (
            <li key={q.id}>
              <button type="button" className="inicio__abrir" onClick={() => alElegir(q.id)}>
                {q.nombre}
                {textoFechas(q) !== '' && <small className="inicio__fechas">{textoFechas(q)}</small>}
              </button>
              <button type="button" aria-label={`Editar ${q.nombre}`} onClick={() => setEditando(q)}>
                <ConIcono icono={Pencil}>Editar</ConIcono>
              </button>
              <button type="button" aria-label={`Duplicar ${q.nombre}`} onClick={() => alDuplicar(q.id)}>
                <ConIcono icono={Copy}>Duplicar</ConIcono>
              </button>
              {(puedeEliminar?.(q.id) ?? true) && <EliminarQuedada nombre={q.nombre} onEliminar={() => alEliminar(q.id)} />}
            </li>
          ))}
        </ul>
      )}
      {children}
      {anadiendo && (
        <DatosDeQuedada titulo="Nueva quedada" envio="Añadir" inicial={{ nombre: '', inicio: null, fin: null }} onGuardar={alCrear} onCerrar={() => setAnadiendo(false)} />
      )}
      {editando && (
        <DatosDeQuedada
          titulo="Editar quedada"
          envio="Guardar"
          inicial={editando}
          onGuardar={(d) => alEditar(editando.id, d)}
          onCerrar={() => setEditando(null)}
        />
      )}
    </section>
  )
}
