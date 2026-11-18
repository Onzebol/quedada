import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { compradores } from '../dominio/compradores'
import { anadirGasto, borrarGasto, editarGasto } from '../dominio/gastos'
import { formatearEuros, parsearEuros } from '../dominio/numeros'
import type { Gasto, Id, Quedada } from '../dominio/tipos'
import { rutaTique, type Imagenes } from '../tiques/almacenImagenes'
import { MiniaturaTique } from '../tiques/MiniaturaTique'
import { BotonBorrar } from '../ui/BotonBorrar'
import { ConIcono } from '../ui/ConIcono'
import { FormularioModal } from '../ui/FormularioModal'
import './casa.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  crearId: () => Id
  /** Dónde guardar las fotos de los tiques; sin ello no se ofrece la foto. */
  imagenes?: Imagenes
}

const aTexto = (centimos: number) => String(centimos / 100).replace('.', ',')

/** Lo que ha puesto cada uno de su bolsillo, esté o no en la lista de la compra: de aquí salen las cuentas (con el alquiler). */
export function Gastos({ quedada, aplicar, crearId, imagenes }: Props) {
  const quienes = compradores(quedada)
  const nombre = (id: Id) => quienes.find((c) => c.id === id)?.nombre ?? id
  const [ventana, setVentana] = useState<'nuevo' | Gasto | null>(null)
  const total = quedada.gastos.reduce((suma, g) => suma + g.importe, 0)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Sube cada vez que se cambia una foto: la ruta no cambia y así se vuelve a pedir la miniatura. */
  const [version, setVersion] = useState(0)

  async function guardar(editando: Gasto | null, v: ValoresGasto) {
    setAviso(null)
    const id = editando?.id ?? crearId()
    const concepto = v.concepto.trim() === '' && v.foto ? 'Tique' : v.concepto
    let imagen: string | null | undefined
    try {
      if (v.foto && imagenes) {
        imagen = rutaTique(quedada.id, id)
        await imagenes.almacen.subir(imagen, await imagenes.reducir(v.foto))
        setVersion((n) => n + 1)
      } else if (v.quitarFoto && editando?.imagen) {
        imagen = null
      }
    } catch {
      setAviso(`No se pudo subir la foto del tique «${concepto}». Inténtalo de nuevo.`)
      return
    }
    const datos = { pagadorId: v.pagadorId, concepto, importe: v.importe }
    aplicar((q) =>
      editando
        ? editarGasto(q, id, imagen === undefined ? datos : { ...datos, imagen })
        : anadirGasto(q, { id, ...datos, ...(imagen ? { imagen } : {}) }),
    )
    if (imagen === null && editando?.imagen) borrarFotos(editando.imagen)
  }

  /** Quita las fotos del almacén; si falla no pasa nada grave (queda una imagen suelta, invisible). */
  function borrarFotos(...rutas: string[]) {
    imagenes?.almacen.borrar(rutas).catch(() => {})
  }

  return (
    <>
      <section className="casa" aria-label="Gastos pagados">
        <div className="gastos__cabecera">
          <h2>Gastos</h2>
          {quienes.length > 0 && (
            <button type="button" onClick={() => setVentana('nuevo')}>
              <ConIcono icono={Plus}>Añadir gasto</ConIcono>
            </button>
          )}
        </div>
        <p className="casa__nota">
          Apunta lo que ha pagado cada uno, esté o no en la lista de la compra: las cuentas se hacen con estos gastos y con los
          pagos de la casa. Los precios de la lista de la compra son orientativos y no cuentan.
        </p>
        {aviso !== null && <p role="alert">{aviso}</p>}
        {quienes.length === 0 && <p className="casa__nota">Añade primero las personas en la pestaña «La casa».</p>}
        {quedada.gastos.length > 0 && (
          <>
            <ul className="pagos__lista" aria-label="Gastos">
              {quedada.gastos.map((g) => (
                <li key={g.id} className={imagenes && g.imagen ? 'pago pago--con-tique' : 'pago'}>
                  {imagenes && g.imagen && (
                    <MiniaturaTique key={`${g.imagen}:${version}`} almacen={imagenes.almacen} ruta={g.imagen} concepto={g.concepto} />
                  )}
                  <span className="pago__quien">
                    <strong>{g.concepto}</strong>
                    <span className="pago__concepto">{nombre(g.pagadorId)}</span>
                  </span>
                  <span className="pago__importe">{formatearEuros(g.importe)}</span>
                  <span className="pago__acciones">
                    <button type="button" aria-label={`Editar gasto ${g.concepto}`} onClick={() => setVentana(g)}>
                      <ConIcono icono={Pencil}>Editar</ConIcono>
                    </button>
                    <BotonBorrar
                      texto="Borrar"
                      etiqueta={`Borrar gasto ${g.concepto}`}
                      titulo={`¿Borrar el gasto «${g.concepto}»?`}
                      mensaje="Dejará de contar en las cuentas. No se puede deshacer."
                      onConfirmar={() => {
                        aplicar((q) => borrarGasto(q, g.id))
                        if (g.imagen) borrarFotos(g.imagen)
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p>
              <strong>Total de gastos:</strong> {formatearEuros(total)}
            </p>
          </>
        )}
      </section>

      {ventana !== null && (
        <FormularioGasto
          quienes={quienes}
          inicial={ventana === 'nuevo' ? null : ventana}
          conFoto={imagenes !== undefined}
          onCerrar={() => setVentana(null)}
          onGuardar={(valores) => void guardar(ventana === 'nuevo' ? null : ventana, valores)}
        />
      )}
    </>
  )
}

interface ValoresGasto {
  pagadorId: Id
  concepto: string
  importe: number
  /** Foto del tique elegida ahora, si la hay. */
  foto: File | null
  /** Quitar la foto que ya tenía el gasto. */
  quitarFoto: boolean
}

interface PropsFormulario {
  quienes: { id: Id; nombre: string }[]
  inicial: Gasto | null
  conFoto: boolean
  onGuardar: (valores: ValoresGasto) => void
  onCerrar: () => void
}

function FormularioGasto({ quienes, inicial, conFoto, onGuardar, onCerrar }: PropsFormulario) {
  const [pagadorId, setPagadorId] = useState(inicial?.pagadorId ?? quienes[0]?.id ?? '')
  const [concepto, setConcepto] = useState(inicial?.concepto ?? '')
  const [importe, setImporte] = useState(inicial ? aTexto(inicial.importe) : '')
  const [foto, setFoto] = useState<File | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)

  return (
    <FormularioModal
      titulo={inicial ? 'Editar gasto' : 'Añadir gasto'}
      envio={inicial ? 'Guardar' : 'Añadir'}
      onCerrar={onCerrar}
      onEnviar={() => {
        const euros = parsearEuros(importe)
        if (euros === null) return
        onGuardar({ pagadorId, concepto, importe: Math.round(euros * 100), foto, quitarFoto })
      }}
    >
      <label>
        Quién pagó
        <select value={pagadorId} onChange={(e) => setPagadorId(e.target.value)}>
          {quienes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Concepto
        <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </label>
      <label>
        Importe (€)
        <input type="text" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} />
      </label>
      {conFoto && (
        <>
          <label className="tique__campo">
            Foto del tique
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>
          {inicial?.imagen && foto === null && (
            <label className="tique__quitar">
              <input type="checkbox" checked={quitarFoto} onChange={(e) => setQuitarFoto(e.target.checked)} />
              Quitar la foto
            </label>
          )}
        </>
      )}
    </FormularioModal>
  )
}
