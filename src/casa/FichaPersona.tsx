import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { pesoCasa, quitarComponente } from '../dominio/casa'
import { editarParticipante } from '../dominio/operaciones'
import type { Participante, Quedada } from '../dominio/tipos'
import { BotonBorrar } from '../ui/BotonBorrar'
import { useMio } from '../ui/MisCosas'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'

interface Props {
  participante: Participante
  aplicar: (cambio: (q: Quedada) => Quedada) => void
}

/** Un componente de una familia (o participante sin familia): su nombre y lo que paga, solo lectura. «Editar» abre la ventana. */
export function FichaPersona({ participante: p, aplicar }: Props) {
  const [editando, setEditando] = useState(false)
  return (
    <li className="persona" {...useMio(p.familiaId === undefined ? p.id : null)}>
      <span className="persona__nombre">{p.nombre}</span>
      <span className="persona__datos">
        <span>{p.adulto === false ? 'Menor' : 'Adulto'}</span>
        <span>Casa {pesoCasa(p)} %</span>
        <span>Demás gastos {p.porcentajeComida ?? 100} %</span>
      </span>
      <span className="persona__acciones">
        <button type="button" aria-label={`Editar persona ${p.nombre}`} onClick={() => setEditando(true)}>
          <ConIcono icono={Pencil}>Editar</ConIcono>
        </button>
        <BotonBorrar
          texto="Borrar"
          etiqueta={`Borrar persona ${p.nombre}`}
          titulo={`¿Borrar a «${p.nombre}»?`}
          mensaje="Dejará de repartir gastos, y lo que compraba o pagaba de la casa quedará sin asignar. No se puede deshacer."
          onConfirmar={() => aplicar((q) => quitarComponente(q, p.id))}
        />
      </span>
      {editando && <EditarPersona participante={p} aplicar={aplicar} onCerrar={() => setEditando(false)} />}
    </li>
  )
}

function EditarPersona({ participante: p, aplicar, onCerrar }: Props & { onCerrar: () => void }) {
  const [nombre, setNombre] = useState(p.nombre)
  const [casa, setCasa] = useState(String(pesoCasa(p)))
  const [adulto, setAdulto] = useState(p.adulto !== false)
  const [gastos, setGastos] = useState(String(p.porcentajeComida ?? 100))

  function guardar() {
    const cambios: Parameters<typeof editarParticipante>[2] = { nombre, adulto }
    if (casa.trim() !== '' && !Number.isNaN(Number(casa))) cambios.porcentajeCasa = Number(casa)
    if (gastos.trim() !== '' && !Number.isNaN(Number(gastos))) cambios.porcentajeComida = Number(gastos)
    aplicar((q) => editarParticipante(q, p.id, cambios))
  }

  return (
    <FormularioModal titulo="Editar persona" envio="Guardar" onEnviar={guardar} onCerrar={onCerrar}>
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
      <label>
        % casa
        <input type="number" min={0} max={100} value={casa} onChange={(e) => setCasa(e.target.value)} />
      </label>
      <label>
        % demás gastos
        <input type="number" min={0} max={100} value={gastos} onChange={(e) => setGastos(e.target.value)} />
      </label>
    </FormularioModal>
  )
}
