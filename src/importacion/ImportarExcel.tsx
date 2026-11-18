import { useState } from 'react'
import type { Repositorio } from '../dominio/repositorio'
import type { Id } from '../dominio/tipos'
import './importar.css'
import type { InformeImportacion } from './importarHoja'

interface Props {
  leer: (archivo: Blob) => Promise<InformeImportacion>
  repositorio: Repositorio
  /**
   * Id de la cuenta con sesión. Los ids de las quedadas importadas salen del nombre de la hoja y son
   * claves globales en el servidor, así que se les antepone para que dos cuentas que importen el
   * mismo Excel no choquen. Sin él (tests, modo local) los ids no cambian.
   */
  espacio?: string
  /** Ids de las quedadas guardadas, en el orden del Excel (la primera suele ser la más reciente). */
  onImportado: (ids: Id[]) => void
}

type Estado =
  | { tipo: 'espera' }
  | { tipo: 'leyendo' }
  | { tipo: 'listo'; informe: InformeImportacion }
  | { tipo: 'error'; mensaje: string }

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Id con el que se guarda una quedada importada. Si la cuenta ya la tenía con el id antiguo (sin
 * prefijo, importada antes de existir los prefijos) se sigue usando ese, para sustituirla y no
 * duplicarla. Las quedadas de otras cuentas no se ven, así que no cuentan.
 */
async function idDeDestino(repositorio: Repositorio, espacio: string | undefined, id: Id): Promise<Id> {
  if (espacio === undefined) return id
  return (await repositorio.obtener(id)) !== null ? id : `${espacio}-${id}`
}

export function ImportarExcel({ leer, repositorio, espacio, onImportado }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'espera' })

  async function importar(archivo: File) {
    setEstado({ tipo: 'leyendo' })
    try {
      const informe = await leer(archivo)
      const guardadas: Id[] = []
      for (const { quedada } of informe.importadas) {
        const id = await idDeDestino(repositorio, espacio, quedada.id)
        // El Excel no trae asistentes ni la casa: al reimportar se conservan los que ya había
        // (y, de cada participante que sigue, su familia y su porcentaje de casa).
        const previa = await repositorio.obtener(id)
        guardadas.push(id)
        const casa = previa?.casa ?? quedada.casa
        // La familia que ya tenía el participante manda; si no tenía, vale la que crea el importador.
        const participantes = quedada.participantes.map((p) => {
          const antes = previa?.participantes.find((x) => x.id === p.id)
          return {
            ...p,
            ...(antes?.familiaId !== undefined && { familiaId: antes.familiaId }),
            ...(antes?.porcentajeCasa !== undefined && { porcentajeCasa: antes.porcentajeCasa }),
          }
        })
        const familiasPrevias = previa?.asistentes ?? []
        const familiasNuevas = quedada.asistentes.filter(
          (f) => !familiasPrevias.some((x) => x.id === f.id) && participantes.some((p) => p.familiaId === f.id),
        )
        const asistentesFinales = [...familiasPrevias, ...familiasNuevas]
        await repositorio.guardar({
          ...quedada,
          id,
          casa,
          participantes,
          asistentes: asistentesFinales,
          basicos: previa?.basicos ?? [],
          gastos: previa?.gastos ?? [],
          pagos: (previa?.pagos ?? []).filter((p) => asistentesFinales.some((f) => f.id === p.familiaId)),
        })
      }
      if (informe.importadas.length === 0) {
        setEstado({ tipo: 'error', mensaje: 'No se encontró ninguna hoja «Compras AAAA» en ese archivo.' })
        return
      }
      setEstado({ tipo: 'listo', informe })
      onImportado(guardadas)
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
