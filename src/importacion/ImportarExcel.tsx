import { useState } from 'react'
import type { Repositorio } from '../dominio/repositorio'
import type { Id } from '../dominio/tipos'
import './importar.css'
import type { InformeImportacion } from './importarHoja'

interface Props {
  leer: (archivo: Blob) => Promise<InformeImportacion>
  repositorio: Repositorio
  /** Ids de las quedadas guardadas, en el orden del Excel (la primera suele ser la más reciente). */
  onImportado: (ids: Id[]) => void
}

type Estado =
  | { tipo: 'espera' }
  | { tipo: 'leyendo' }
  | { tipo: 'listo'; informe: InformeImportacion }
  | { tipo: 'error'; mensaje: string }

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function ImportarExcel({ leer, repositorio, onImportado }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'espera' })

  async function importar(archivo: File) {
    setEstado({ tipo: 'leyendo' })
    try {
      const informe = await leer(archivo)
      for (const { quedada } of informe.importadas) {
        // El Excel no trae asistentes: al reimportar se conservan los que ya había.
        const previa = await repositorio.obtener(quedada.id)
        await repositorio.guardar({
          ...quedada,
          asistentes: previa?.asistentes ?? [],
          basicos: previa?.basicos ?? [],
        })
      }
      if (informe.importadas.length === 0) {
        setEstado({ tipo: 'error', mensaje: 'No se encontró ninguna hoja «Compras AAAA» en ese archivo.' })
        return
      }
      setEstado({ tipo: 'listo', informe })
      onImportado(informe.importadas.map((i) => i.quedada.id))
    } catch {
      setEstado({ tipo: 'error', mensaje: 'No se pudo leer el archivo. Comprueba que es un Excel (.xlsx).' })
    }
  }

  return (
    <section className="importar" aria-label="Importar Excel">
      <label>
        Archivo de Excel (.xlsx)
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            if (archivo) void importar(archivo)
            e.target.value = ''
          }}
        />
      </label>
      <p className="importar__ayuda">
        Se importan las hojas «Compras AAAA». Importar otra vez el mismo archivo sustituye esas quedadas por los datos
        del Excel.
      </p>

      {estado.tipo === 'leyendo' && <p role="status">Leyendo el archivo…</p>}
      {estado.tipo === 'error' && <p role="alert">{estado.mensaje}</p>}
      {estado.tipo === 'listo' && <Informe informe={estado.informe} />}
    </section>
  )
}

function Informe({ informe }: { informe: InformeImportacion }) {
  const resumen = informe.importadas
    .map((i) => `${i.quedada.nombre} (${plural(i.quedada.productos.length, 'producto', 'productos')})`)
    .join(', ')
  return (
    <div className="importar__informe">
      <p role="status">
        Importadas {informe.importadas.length} {informe.importadas.length === 1 ? 'quedada' : 'quedadas'}: {resumen}
      </p>
      {informe.ignoradas.length > 0 && <p>Hojas ignoradas: {informe.ignoradas.join(', ')}</p>}
      {informe.importadas
        .filter((i) => i.avisos.length > 0)
        .map((i) => (
          <details key={i.quedada.id}>
            <summary>
              {plural(i.avisos.length, 'aviso', 'avisos')} en {i.quedada.nombre}
            </summary>
            <ul>
              {i.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        ))}
    </div>
  )
}
