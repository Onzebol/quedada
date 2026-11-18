import { MapPin, Pencil } from 'lucide-react'
import { Fragment, useState } from 'react'
import { editarCasa } from '../dominio/casa'
import { formatearEuros, parsearEuros } from '../dominio/numeros'
import type { Quedada } from '../dominio/tipos'
import { ConIcono } from '../ui/ConIcono'
import { partirEnlaces } from './enlaces'
import { MapaAjustable } from './MapaAjustable'
import { MapaCasa } from './MapaCasa'
import { geocodificarNominatim, urlAppMapas, type Geocodificador } from './mapa'
import './casa.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  geocodificar?: Geocodificador
}

const aEuros = (centimos: number | null) => (centimos === null ? '' : String(centimos / 100).replace('.', ','))

/** Texto con sus enlaces `http(s)` convertidos en enlaces: nunca se inserta HTML. */
function ConEnlaces({ texto }: { texto: string }) {
  return (
    <>
      {partirEnlaces(texto).map((t, i) =>
        t.tipo === 'enlace' ? (
          <a key={i} href={t.valor} target="_blank" rel="noopener noreferrer">
            {t.valor}
          </a>
        ) : (
          <Fragment key={i}>{t.valor}</Fragment>
        ),
      )}
    </>
  )
}

/** Mapa de la ficha; con `nombre` ofrece, solo en el móvil, abrir la casa en su aplicación de mapas. */
function Mapa({ latitud, longitud, nombre }: { latitud: number; longitud: number; nombre?: string }) {
  const enlaceApp = nombre === undefined ? null : urlAppMapas(latitud, longitud, nombre)
  return <MapaCasa latitud={latitud} longitud={longitud} enlaceApp={enlaceApp} />
}

/** La casa: se ve como una ficha y, con «Editar», cambia al formulario; al guardar vuelve a la ficha. */
export function DatosCasa({ quedada, aplicar, geocodificar }: Props) {
  const [editando, setEditando] = useState(false)
  return editando ? (
    <FormularioCasa
      quedada={quedada}
      aplicar={aplicar}
      geocodificar={geocodificar}
      alTerminar={() => setEditando(false)}
    />
  ) : (
    <FichaCasa quedada={quedada} alEditar={() => setEditando(true)} />
  )
}

function FichaCasa({ quedada, alEditar }: { quedada: Quedada; alEditar: () => void }) {
  const { casa } = quedada
  const vacia = casa.titulo === '' && casa.descripcion === '' && casa.direccion === '' && casa.precio === null

  return (
    <section className="casa" aria-label="Datos de la casa">
      <div className="casa__cabecera">
        <h2>{casa.titulo === '' ? 'La casa' : casa.titulo}</h2>
        <button type="button" onClick={alEditar}>
          <ConIcono icono={Pencil}>Editar la casa</ConIcono>
        </button>
      </div>

      {vacia && <p className="casa__nota">Todavía no hay datos de la casa. Pulsa «Editar la casa» para añadirlos.</p>}

      {casa.descripcion !== '' && (
        <p className="casa__descripcion">
          <ConEnlaces texto={casa.descripcion} />
        </p>
      )}

      {casa.direccion !== '' && (
        <p>
          <strong>Dirección:</strong> {casa.direccion}
        </p>
      )}
      {casa.latitud !== null && casa.longitud !== null && (
        <Mapa latitud={casa.latitud} longitud={casa.longitud} nombre={casa.titulo} />
      )}

      {casa.precio !== null && (
        <p>
          <strong>Precio:</strong> {formatearEuros(casa.precio)}
        </p>
      )}
    </section>
  )
}

type Aviso = 'noEncontrada' | 'fallo' | 'precio' | null

function FormularioCasa({
  quedada,
  aplicar,
  geocodificar = geocodificarNominatim,
  alTerminar,
}: Props & { alTerminar: () => void }) {
  const { casa } = quedada
  const [titulo, setTitulo] = useState(casa.titulo)
  const [descripcion, setDescripcion] = useState(casa.descripcion)
  const [direccion, setDireccion] = useState(casa.direccion)
  const [precio, setPrecio] = useState(aEuros(casa.precio))
  const [sitio, setSitio] = useState({ latitud: casa.latitud, longitud: casa.longitud })
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)

  async function situar() {
    setBuscando(true)
    setAviso(null)
    try {
      const encontrado = await geocodificar(direccion.trim())
      if (encontrado === null) setAviso('noEncontrada')
      else setSitio(encontrado)
    } catch {
      setAviso('fallo')
    } finally {
      setBuscando(false)
    }
  }

  function guardar() {
    const texto = precio.trim()
    const euros = parsearEuros(texto)
    if (texto !== '' && euros === null) {
      setAviso('precio')
      return
    }
    const cambios = {
      titulo,
      descripcion,
      direccion,
      precio: texto === '' ? null : Math.round((euros ?? 0) * 100),
    }
    // Cambiar la dirección borra las coordenadas; después se ponen las del formulario.
    aplicar((q) => editarCasa(editarCasa(q, cambios), sitio))
    alTerminar()
  }

  return (
    <section className="casa" aria-label="Datos de la casa">
      <h2>Editar la casa</h2>
      <form
        aria-label="Editar la casa"
        className="casa__formulario"
        onSubmit={(e) => {
          e.preventDefault()
          guardar()
        }}
      >
        <label>
          Título de la casa
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>

        <label>
          Descripción de la casa
          <textarea
            rows={4}
            aria-describedby="casa-ayuda-enlaces"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <p id="casa-ayuda-enlaces" className="casa__ayuda">
          Los enlaces que empiecen por http:// o https:// se mostrarán como enlaces.
        </p>

        <label>
          Dirección de la casa
          <input
            type="text"
            value={direccion}
            onChange={(e) => {
              setDireccion(e.target.value)
              // Las coordenadas eran de la dirección anterior.
              setSitio({ latitud: null, longitud: null })
            }}
          />
        </label>
        <div className="casa__acciones">
          <button type="button" disabled={direccion.trim() === '' || buscando} onClick={() => void situar()}>
            <ConIcono icono={MapPin}>Situar en el mapa</ConIcono>
          </button>
          {aviso === 'noEncontrada' && <p role="alert">No se encontró esa dirección. Prueba con otra más completa.</p>}
          {aviso === 'fallo' && <p role="alert">No se pudo buscar la dirección. Inténtalo de nuevo.</p>}
        </div>
        {sitio.latitud !== null && sitio.longitud !== null && (
          <MapaAjustable
            latitud={sitio.latitud}
            longitud={sitio.longitud}
            onMover={(latitud, longitud) => setSitio({ latitud, longitud })}
          />
        )}

        <label>
          Precio de la casa (€)
          <input type="text" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
        </label>
        {aviso === 'precio' && <p role="alert">El precio no es válido: escribe un número, por ejemplo 1250,50.</p>}

        <div className="casa__acciones">
          <button type="submit">Guardar</button>
          <button type="button" onClick={alTerminar}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}
