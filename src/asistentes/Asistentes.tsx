import { Plus } from 'lucide-react'
import { ConIcono } from '../ui/ConIcono'
import { useState } from 'react'
import { FilaComponente } from '../casa/FilaComponente'
import { anadirComponente, asignarFamilia } from '../dominio/casa'
import {
  anadirAsistente,
  anadirBasico,
  asignarBasico,
  basicosSinAsignar,
  borrarAsistente,
  borrarBasico,
  editarAsistente,
  ordenarPorLlegada,
  personasDe,
  totalAsistentes,
} from '../dominio/asistentes'
import type { Id, Quedada } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import './asistentes.css'
import { CampoEntero } from './CampoEntero'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  crearId: () => Id
}

export function Asistentes({ quedada, aplicar, crearId }: Props) {
  const [familia, setFamilia] = useState('')
  const [personas, setPersonas] = useState(1)
  const [llegada, setLlegada] = useState('')
  const [basico, setBasico] = useState('')
  // Cambia al añadir para reiniciar el campo de personas, que lleva su propio texto.
  const [reinicio, setReinicio] = useState(0)

  const total = totalAsistentes(quedada)
  const sinAsignar = basicosSinAsignar(quedada)

  return (
    <section className="asistentes" aria-label="Asistentes">
      <h2>Asistentes</h2>
      <p aria-live="polite" className="asistentes__total">
        {total} {total === 1 ? 'asistente' : 'asistentes'}
      </p>

      <form
        aria-label="Nuevo asistente"
        onSubmit={(e) => {
          e.preventDefault()
          aplicar((q) => anadirAsistente(q, { id: crearId(), familia, personas, llegada: llegada === '' ? null : llegada }))
          setFamilia('')
          setPersonas(1)
          setLlegada('')
          setReinicio((v) => v + 1)
        }}
      >
        <label>
          Familia
          <input type="text" value={familia} onChange={(e) => setFamilia(e.target.value)} />
        </label>
        <label>
          Personas
          <CampoEntero key={reinicio} valor={personas} onCambiar={setPersonas} />
        </label>
        <label>
          Llegada
          <input type="time" value={llegada} onChange={(e) => setLlegada(e.target.value)} />
        </label>
        <button type="submit"><ConIcono icono={Plus}>Añadir asistente</ConIcono></button>
      </form>

      <ul className="asistentes__lista">
        {ordenarPorLlegada(quedada.asistentes).map((a) => (
          <li key={a.id}>
            <input
              type="text"
              aria-label={`Familia de ${a.familia}`}
              defaultValue={a.familia}
              onBlur={(e) => aplicar((q) => editarAsistente(q, a.id, { familia: e.target.value }))}
            />
            {quedada.participantes.some((p) => p.familiaId === a.id) ? (
              <span>
                {personasDe(quedada, a)} {personasDe(quedada, a) === 1 ? 'persona' : 'personas'}
              </span>
            ) : (
              <CampoEntero
                aria-label={`Personas de ${a.familia}`}
                valor={a.personas}
                onCambiar={(n) => aplicar((q) => editarAsistente(q, a.id, { personas: n }))}
              />
            )}
            <input
              type="time"
              aria-label={`Llegada de ${a.familia}`}
              value={a.llegada ?? ''}
              onChange={(e) => aplicar((q) => editarAsistente(q, a.id, { llegada: e.target.value === '' ? null : e.target.value }))}
            />
            <BotonBorrar
              texto={`Borrar ${a.familia}`}
              titulo={`¿Borrar la familia «${a.familia}»?`}
              mensaje="Dejará de contar entre quienes vienen y los básicos que traía quedarán sin asignar. No se puede deshacer."
              onConfirmar={() => aplicar((q) => borrarAsistente(q, a.id))}
            />
            <ul className="asistentes__componentes" aria-label={`Componentes de ${a.familia}`}>
              {quedada.participantes
                .filter((p) => p.familiaId === a.id)
                .map((p) => (
                  <FilaComponente key={p.id} participante={p} aplicar={aplicar}>
                    <label>
                      Familia de {p.nombre}
                      <select
                        value={a.id}
                        onChange={(e) => aplicar((q) => asignarFamilia(q, p.id, e.target.value === '' ? null : e.target.value))}
                      >
                        <option value="">Sin familia</option>
                        {quedada.asistentes.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.familia}
                          </option>
                        ))}
                      </select>
                    </label>
                  </FilaComponente>
                ))}
            </ul>
            <NuevoComponente familia={a.familia} alAnadir={(nombre) => aplicar((q) => anadirComponente(q, { id: crearId(), familiaId: a.id, nombre }))} />
          </li>
        ))}
      </ul>

      {quedada.participantes.some((p) => p.familiaId === undefined) && (
        <>
          <h4>Participantes sin familia</h4>
          <ul className="asistentes__componentes" aria-label="Participantes sin familia">
            {quedada.participantes
              .filter((p) => p.familiaId === undefined)
              .map((p) => (
                <FilaComponente key={p.id} participante={p} aplicar={aplicar}>
                  <label>
                    Familia de {p.nombre}
                    <select
                      value=""
                      disabled={quedada.asistentes.length === 0}
                      onChange={(e) => aplicar((q) => asignarFamilia(q, p.id, e.target.value === '' ? null : e.target.value))}
                    >
                      <option value="">Sin familia</option>
                      {quedada.asistentes.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.familia}
                        </option>
                      ))}
                    </select>
                  </label>
                </FilaComponente>
              ))}
          </ul>
        </>
      )}

      <h4>Básicos</h4>
      <p className="asistentes__resumen">
        {sinAsignar.length === 0
          ? 'Todos los básicos tienen quién los traiga'
          : `Sin asignar: ${sinAsignar.map((b) => b.nombre).join(', ')}`}
      </p>

      <form
        aria-label="Nuevo básico"
        onSubmit={(e) => {
          e.preventDefault()
          aplicar((q) => anadirBasico(q, { id: crearId(), nombre: basico }))
          setBasico('')
        }}
      >
        <label>
          Nombre del básico
          <input type="text" value={basico} onChange={(e) => setBasico(e.target.value)} />
        </label>
        <button type="submit"><ConIcono icono={Plus}>Añadir básico</ConIcono></button>
      </form>

      <ul className="asistentes__lista">
        {quedada.basicos.map((b) => (
          <li key={b.id}>
            <span>{b.nombre}</span>
            <select
              aria-label={`Quién trae ${b.nombre}`}
              value={b.asistenteId ?? ''}
              onChange={(e) => aplicar((q) => asignarBasico(q, b.id, e.target.value === '' ? null : e.target.value))}
            >
              <option value="">Sin asignar</option>
              {quedada.asistentes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.familia}
                </option>
              ))}
            </select>
            <BotonBorrar
              texto={`Borrar básico ${b.nombre}`}
              titulo={`¿Borrar el básico «${b.nombre}»?`}
              mensaje="Se quitará de la lista de básicos. No se puede deshacer."
              onConfirmar={() => aplicar((q) => borrarBasico(q, b.id))}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function NuevoComponente({ familia, alAnadir }: { familia: string; alAnadir: (nombre: string) => void }) {
  const [nombre, setNombre] = useState('')
  return (
    <form
      aria-label={`Nuevo componente de ${familia}`}
      className="asistentes__nuevo-componente"
      onSubmit={(e) => {
        e.preventDefault()
        alAnadir(nombre)
        setNombre('')
      }}
    >
      <label>
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <button type="submit" aria-label={`Añadir componente a ${familia}`}>
        <ConIcono icono={Plus}>Añadir componente</ConIcono>
      </button>
    </form>
  )
}
