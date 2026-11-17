import { MapPin } from 'lucide-react'
import { Fragment, useState } from 'react'
import { editarCasa, partesDeLaCasa } from '../dominio/casa'
import { formatearEuros, parsearEuros } from '../dominio/numeros'
import type { Quedada } from '../dominio/tipos'
import { ConIcono } from '../ui/ConIcono'
import { partirEnlaces } from './enlaces'
import { geocodificarNominatim, urlAbrirMapa, urlMapaIncrustado, type Geocodificador } from './mapa'
import './casa.css'

interface Props {
  quedada: Quedada
  aplicar: (cambio: (q: Quedada) => Quedada) => void
  geocodificar?: Geocodificador
}

type Aviso = 'noEncontrada' | 'fallo' | null

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

export function DatosCasa({ quedada, aplicar, geocodificar = geocodificarNominatim }: Props) {
  const { casa } = quedada
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const partes = partesDeLaCasa(quedada)

  async function situar() {
    setBuscando(true)
    setAviso(null)
    try {
      const sitio = await geocodificar(casa.direccion)
      if (sitio === null) setAviso('noEncontrada')
      else aplicar((q) => editarCasa(q, { latitud: sitio.latitud, longitud: sitio.longitud }))
    } catch {
      setAviso('fallo')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section className="casa" aria-label="Datos de la casa">
      <h2>{casa.titulo === '' ? 'La casa' : casa.titulo}</h2>

      <label>
        Título de la casa
        <input
          key={casa.titulo}
          type="text"
          defaultValue={casa.titulo}
          onBlur={(e) => aplicar((q) => editarCasa(q, { titulo: e.target.value }))}
        />
      </label>

      <label>
        Descripción de la casa
        <textarea
          key={casa.descripcion}
          rows={4}
          defaultValue={casa.descripcion}
          onBlur={(e) => aplicar((q) => editarCasa(q, { descripcion: e.target.value }))}
        />
      </label>
      {casa.descripcion !== '' && (
        <p className="casa__descripcion">
          <ConEnlaces texto={casa.descripcion} />
        </p>
      )}

      <label>
        Dirección de la casa
        <input
          key={casa.direccion}
          type="text"
          defaultValue={casa.direccion}
          onBlur={(e) => aplicar((q) => editarCasa(q, { direccion: e.target.value }))}
        />
      </label>
      <div className="casa__acciones">
        <button type="button" disabled={casa.direccion.trim() === '' || buscando} onClick={() => void situar()}>
          <ConIcono icono={MapPin}>Situar en el mapa</ConIcono>
        </button>
        {aviso === 'noEncontrada' && <p role="alert">No se encontró esa dirección. Prueba con otra más completa.</p>}
        {aviso === 'fallo' && <p role="alert">No se pudo buscar la dirección. Inténtalo de nuevo.</p>}
      </div>
      {casa.latitud !== null && casa.longitud !== null && (
        <div className="casa__mapa">
          <iframe title="Mapa de la casa" src={urlMapaIncrustado(casa.latitud, casa.longitud)} loading="lazy" />
          <a href={urlAbrirMapa(casa.latitud, casa.longitud)} target="_blank" rel="noopener noreferrer">
            Abrir en OpenStreetMap
          </a>
        </div>
      )}

      <label>
        Precio de la casa (€)
        <input
          key={casa.precio ?? 'sin'}
          type="text"
          inputMode="decimal"
          defaultValue={aEuros(casa.precio)}
          onBlur={(e) => {
            const texto = e.target.value.trim()
            const euros = parsearEuros(texto)
            if (texto === '') aplicar((q) => editarCasa(q, { precio: null }))
            else if (euros !== null) aplicar((q) => editarCasa(q, { precio: Math.round(euros * 100) }))
            else e.target.value = aEuros(casa.precio)
          }}
        />
      </label>

      <label>
        Quién pagó la casa
        <select
          value={casa.pagadorId ?? ''}
          onChange={(e) => aplicar((q) => editarCasa(q, { pagadorId: e.target.value === '' ? null : e.target.value }))}
        >
          <option value="">Nadie todavía</option>
          {quedada.participantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      {casa.precio !== null && casa.pagadorId === null && (
        <p className="casa__nota">Mientras nadie figure como pagador, el precio no entra en las cuentas.</p>
      )}

      <h4>Lo que paga cada uno</h4>
      <ul className="casa__partes" aria-label="Lo que paga cada uno de la casa">
        {quedada.participantes.map((p) => (
          <li key={p.id}>
            {p.nombre}: {formatearEuros(partes[p.id] ?? 0)}
          </li>
        ))}
      </ul>
    </section>
  )
}
