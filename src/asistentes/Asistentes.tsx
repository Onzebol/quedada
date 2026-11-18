import { ChevronDown, Pencil, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { FichaPersona } from '../casa/FichaPersona'
import { anadirComponente } from '../dominio/casa'
import {
  anadirAsistente,
  borrarAsistente,
  editarAsistente,
  ordenarPorNombre,
  pagadorDeLaCasa,
  personasDe,
  totalAsistentes,
} from '../dominio/asistentes'
import type { Asistente, Id, Participante, Quedada } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import './asistentes.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  crearId: () => Id
}

export function Asistentes({ quedada, aplicar, crearId }: Props) {
  const [anadiendo, setAnadiendo] = useState(false)
  const total = totalAsistentes(quedada)
  const sinFamilia = quedada.participantes.filter((p) => p.familiaId === undefined)

  return (
    <section className="asistentes" aria-label="Asistentes">
      <div className="asistentes__cabecera">
        <h2>Asistentes</h2>
        <button type="button" onClick={() => setAnadiendo(true)}>
          <ConIcono icono={Plus}>Añadir familia</ConIcono>
        </button>
      </div>
      <p aria-live="polite" className="asistentes__total">
        {total} {total === 1 ? 'asistente' : 'asistentes'}
      </p>

      <ul className="asistentes__lista">
        {ordenarPorNombre(quedada.asistentes, (a) => a.familia).map((a) => (
          <FichaFamilia key={a.id} quedada={quedada} asistente={a} aplicar={aplicar} crearId={crearId} />
        ))}
      </ul>

      {sinFamilia.length > 0 && (
        <>
          <h4>Participantes sin familia</h4>
          <ul className="asistentes__componentes" aria-label="Participantes sin familia">
            {ordenarPorNombre(sinFamilia, (p) => p.nombre).map((p) => (
              <FichaPersona key={p.id} participante={p} aplicar={aplicar} />
            ))}
          </ul>
        </>
      )}

      {anadiendo && (
        <FormularioFamilia
          titulo="Nueva familia"
          envio="Añadir"
          inicial={{ familia: '', personas: 1, llegada: null }}
          candidatos={[]}
          conPersonas
          onGuardar={(v) =>
            aplicar((q) => anadirAsistente(q, { id: crearId(), familia: v.familia, personas: v.personas, llegada: v.llegada }))
          }
          onCerrar={() => setAnadiendo(false)}
        />
      )}
    </section>
  )
}

interface PropsFamilia {
  quedada: Quedada
  asistente: Asistente
  aplicar: Props['aplicar']
  crearId: () => Id
}

/** Ficha de una familia: solo lectura y contraída por defecto (nombre y datos); sus acciones abren ventanas modales. */
function FichaFamilia({ quedada, asistente: a, aplicar, crearId }: PropsFamilia) {
  const [editando, setEditando] = useState(false)
  const [anadiendo, setAnadiendo] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const idDetalle = useId()
  const componentes = quedada.participantes.filter((p) => p.familiaId === a.id)
  const personas = personasDe(quedada, a)

  return (
    <li className="familia">
      <div className="familia__cabecera">
        <div className="familia__titulo">
          <h3>
            <button
              type="button"
              className="familia__alternar"
              aria-expanded={abierta}
              aria-controls={abierta ? idDetalle : undefined}
              onClick={() => setAbierta((v) => !v)}
            >
              {a.familia}
              <ChevronDown className="icono familia__flecha" size={18} aria-hidden="true" />
            </button>
          </h3>
          <p className="familia__datos">
            <span>
              {personas} {personas === 1 ? 'persona' : 'personas'}
            </span>
            <span>{a.llegada === null ? 'Llegada sin determinar' : `Llega a las ${a.llegada}`}</span>
          </p>
        </div>
        <div className="familia__acciones">
          <button type="button" aria-label={`Editar familia ${a.familia}`} onClick={() => setEditando(true)}>
            <ConIcono icono={Pencil}>Editar familia</ConIcono>
          </button>
          <BotonBorrar
            texto="Borrar"
            etiqueta={`Borrar ${a.familia}`}
            titulo={`¿Borrar la familia «${a.familia}»?`}
            mensaje="Dejará de contar entre quienes vienen; sus componentes quedarán como participantes sin familia. No se puede deshacer."
            onConfirmar={() => aplicar((q) => borrarAsistente(q, a.id))}
          />
        </div>
      </div>

      {abierta && (
        <div id={idDetalle} className="familia__detalle">
          {componentes.length > 0 && (
            <ul className="asistentes__componentes" aria-label={`Personas de la familia ${a.familia}`}>
              {ordenarPorNombre(componentes, (p) => p.nombre).map((p) => (
                <FichaPersona key={p.id} participante={p} aplicar={aplicar} />
              ))}
            </ul>
          )}

          <button type="button" className="familia__anadir" aria-label={`Añadir persona a ${a.familia}`} onClick={() => setAnadiendo(true)}>
            <ConIcono icono={Plus}>Añadir persona</ConIcono>
          </button>
        </div>
      )}

      {editando && (
        <FormularioFamilia
          titulo="Editar familia"
          envio="Guardar"
          inicial={{ familia: a.familia, personas: a.personas, llegada: a.llegada, pagadorId: pagadorDeLaCasa(quedada, a) }}
          candidatos={componentes.filter((p) => p.adulto !== false)}
          conPersonas={componentes.length === 0}
          onGuardar={(v) =>
            aplicar((q) =>
              editarAsistente(q, a.id, {
                familia: v.familia,
                llegada: v.llegada,
                ...(v.pagadorId !== undefined ? { pagadorId: v.pagadorId } : {}),
                ...(componentes.length === 0 ? { personas: v.personas } : {}),
              }),
            )
          }
          onCerrar={() => setEditando(false)}
        />
      )}
      {anadiendo && (
        <NuevaPersona
          alAnadir={(nombre, adulto) => aplicar((q) => anadirComponente(q, { id: crearId(), familiaId: a.id, nombre, adulto }))}
          onCerrar={() => setAnadiendo(false)}
        />
      )}
    </li>
  )
}

interface ValoresFamilia {
  familia: string
  personas: number
  llegada: string | null
  /** Quién paga la casa; `undefined` si la familia no tiene adultos entre los que elegir. */
  pagadorId?: string
}

interface PropsFormularioFamilia {
  titulo: string
  envio: string
  inicial: ValoresFamilia
  /** Adultos de la familia entre los que se elige quién paga la casa. */
  candidatos: Participante[]
  /** Con componentes, el número de personas sale de ellos y no se edita aquí. */
  conPersonas: boolean
  onGuardar: (valores: ValoresFamilia) => void
  onCerrar: () => void
}

function FormularioFamilia({ titulo, envio, inicial, candidatos, conPersonas, onGuardar, onCerrar }: PropsFormularioFamilia) {
  const [familia, setFamilia] = useState(inicial.familia)
  const [personas, setPersonas] = useState(String(inicial.personas))
  const [llegada, setLlegada] = useState(inicial.llegada ?? '')
  const [pagador, setPagador] = useState(inicial.pagadorId ?? '')

  function guardar() {
    const n = Number(personas)
    onGuardar({
      familia,
      personas: Number.isInteger(n) && n >= 1 ? n : inicial.personas,
      llegada: llegada === '' ? null : llegada,
      ...(pagador !== '' ? { pagadorId: pagador } : {}),
    })
  }

  return (
    <FormularioModal titulo={titulo} envio={envio} onEnviar={guardar} onCerrar={onCerrar}>
      <label>
        Familia
        <input type="text" value={familia} onChange={(e) => setFamilia(e.target.value)} />
      </label>
      {conPersonas && (
        <label>
          Personas
          <input type="number" min={1} step={1} value={personas} onChange={(e) => setPersonas(e.target.value)} />
        </label>
      )}
      <label>
        Llegada
        <input type="time" value={llegada} onChange={(e) => setLlegada(e.target.value)} />
      </label>
      {candidatos.length > 0 && (
        <label>
          Quién paga la casa
          <select value={pagador} onChange={(e) => setPagador(e.target.value)}>
            {candidatos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
    </FormularioModal>
  )
}

function NuevaPersona({ alAnadir, onCerrar }: { alAnadir: (nombre: string, adulto: boolean) => void; onCerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [adulto, setAdulto] = useState(true)
  return (
    <FormularioModal titulo="Nueva persona" envio="Añadir" onEnviar={() => alAnadir(nombre, adulto)} onCerrar={onCerrar}>
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label>
        Tipo
        <select value={adulto ? 'adulto' : 'menor'} onChange={(e) => setAdulto(e.target.value === 'adulto')}>
          <option value="adulto">Adulto</option>
          <option value="menor">Menor</option>
        </select>
      </label>
    </FormularioModal>
  )
}
