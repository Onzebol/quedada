import type { ClienteDatos } from '../supabase/repositorioSupabase'

type Fila = Record<string, unknown>

const HIJAS = ['participantes', 'grupos', 'productos', 'asistentes', 'basicos', 'pagos', 'gastos'] as const

export interface Escritura {
  operacion: 'upsert' | 'update' | 'delete'
  tabla: string
  valores?: Fila
  filtros: [string, unknown][]
}

/**
 * Backend de Supabase falso en memoria, compartido entre varios clientes (dos personas a la vez).
 * Aplica las escrituras como Postgres: `update` solo toca las columnas indicadas y `upsert` solo
 * las que trae la fila. Registra las escrituras y puede hacer fallar una concreta.
 */
export interface CanalFalso {
  nombre: string
  privado: boolean
  quitado: boolean
  suscrito: boolean
  alMensaje: ((mensaje: { event: string }) => void) | null
  alEstado: ((estado: string) => void) | null
}

export class BackendSupabaseFalso {
  /** Canales abiertos con `channel(...)`, en orden. */
  canales: CanalFalso[] = []
  /** Orden en que se llamó a `setAuth` y a `subscribe`, para comprobar que se autentica antes. */
  bitacora: string[] = []

  tablas: Record<string, Fila[]> = { quedadas: [], participantes: [], grupos: [], productos: [], asistentes: [], basicos: [], pagos: [], gastos: [] }
  escrituras: Escritura[] = []
  private fallarEn: number | null = null
  private contador = 0

  /** Hace fallar la escritura número `n` (1 es la siguiente) y las demás siguen bien. */
  fallarEscrituraNumero(n: number) {
    this.fallarEn = this.contador + n
  }

  cliente(): ClienteDatos {
    return {
      from: (tabla: string) => new Tabla(this, tabla),
      realtime: {
        setAuth: async () => {
          this.bitacora.push('setAuth')
        },
      },
      channel: (nombre: string, opciones: { config: { private: boolean } }) => {
        const canal: CanalFalso = {
          nombre,
          privado: opciones.config.private,
          quitado: false,
          suscrito: false,
          alMensaje: null,
          alEstado: null,
        }
        this.canales.push(canal)
        const api = {
          on: (_tipo: string, _filtro: unknown, alMensaje: (m: { event: string }) => void) => {
            canal.alMensaje = alMensaje
            return api
          },
          subscribe: (alEstado?: (estado: string) => void) => {
            this.bitacora.push('subscribe')
            canal.suscrito = true
            canal.alEstado = alEstado ?? null
            queueMicrotask(() => alEstado?.('SUBSCRIBED'))
            return api
          },
          canal,
        }
        return api
      },
      removeChannel: async (api: { canal: CanalFalso }) => {
        api.canal.quitado = true
      },
    } as unknown as ClienteDatos
  }

  /** Simula que el servidor avisa de un cambio en el canal de la quedada `id`. */
  emitir(id: string, evento = 'UPDATE') {
    for (const c of this.canales) if (c.nombre === `quedada:${id}` && !c.quitado) c.alMensaje?.({ event: evento })
  }

  /** @internal */
  registrar(e: Escritura): { message: string } | null {
    this.escrituras.push(e)
    this.contador++
    return this.fallarEn === this.contador ? { message: 'fallo de red simulado' } : null
  }
}

class Tabla {
  private readonly backend: BackendSupabaseFalso
  private readonly nombre: string

  constructor(backend: BackendSupabaseFalso, nombre: string) {
    this.backend = backend
    this.nombre = nombre
  }

  select(_columnas: string) {
    return new Lectura(this.backend, this.nombre)
  }
  upsert(filas: Fila | Fila[]) {
    return new Escribir(this.backend, this.nombre, 'upsert', undefined, Array.isArray(filas) ? filas : [filas])
  }
  update(valores: Fila) {
    return new Escribir(this.backend, this.nombre, 'update', valores, [])
  }
  delete() {
    return new Escribir(this.backend, this.nombre, 'delete', undefined, [])
  }
}

function claveDe(tabla: string): string[] {
  return tabla === 'quedadas' ? ['id'] : ['quedada_id', 'id']
}

class Lectura {
  private filtros: [string, unknown][] = []
  private ordenadas = new Set<string>()

  private readonly backend: BackendSupabaseFalso
  private readonly tabla: string

  constructor(backend: BackendSupabaseFalso, tabla: string) {
    this.backend = backend
    this.tabla = tabla
  }

  eq(columna: string, valor: unknown) {
    this.filtros.push([columna, valor])
    return this
  }
  order(_columna: string, opciones?: { referencedTable?: string }) {
    if (opciones?.referencedTable) this.ordenadas.add(opciones.referencedTable)
    return this
  }
  private filas() {
    return this.backend.tablas[this.tabla]
      .filter((f) => this.filtros.every(([c, v]) => f[c] === v))
      .map((f) => {
        const salida: Fila = { ...f }
        for (const hija of HIJAS) {
          const filas = this.backend.tablas[hija].filter((h) => h.quedada_id === f.id).map((h) => ({ ...h }))
          if (this.ordenadas.has(hija)) filas.sort((a, b) => Number(a.posicion) - Number(b.posicion))
          salida[hija] = filas
        }
        return salida
      })
  }
  maybeSingle() {
    return Promise.resolve({ data: this.filas()[0] ?? null, error: null })
  }
  then<T>(res: (v: { data: Fila[]; error: null }) => T) {
    return Promise.resolve({ data: this.filas(), error: null }).then(res)
  }
}

class Escribir {
  private filtros: [string, unknown][] = []

  private readonly backend: BackendSupabaseFalso
  private readonly tabla: string
  private readonly operacion: 'upsert' | 'update' | 'delete'
  private readonly valores: Fila | undefined
  private readonly filas: Fila[]

  constructor(backend: BackendSupabaseFalso, tabla: string, operacion: 'upsert' | 'update' | 'delete', valores: Fila | undefined, filas: Fila[]) {
    this.backend = backend
    this.tabla = tabla
    this.operacion = operacion
    this.valores = valores
    this.filas = filas
  }

  eq(columna: string, valor: unknown) {
    this.filtros.push([columna, valor])
    return this
  }
  in(columna: string, valores: unknown[]) {
    this.filtros.push([columna, valores])
    return this
  }
  private coincide(f: Fila) {
    return this.filtros.every(([c, v]) => (Array.isArray(v) ? v.includes(f[c]) : f[c] === v))
  }
  private ejecutar(): { error: { message: string } | null } {
    const error = this.backend.registrar({
      operacion: this.operacion,
      tabla: this.tabla,
      valores: this.valores ?? (this.filas.length > 0 ? this.filas[0] : undefined),
      filtros: this.filtros,
    })
    if (error) return { error }
    const filas = this.backend.tablas[this.tabla]
    if (this.operacion === 'upsert') {
      const clave = claveDe(this.tabla)
      for (const nueva of this.filas) {
        const existente = filas.find((f) => clave.every((c) => f[c] === nueva[c]))
        if (existente) Object.assign(existente, nueva)
        else filas.push({ ...nueva })
      }
    } else if (this.operacion === 'update') {
      for (const f of filas.filter((x) => this.coincide(x))) Object.assign(f, this.valores)
    } else {
      this.backend.tablas[this.tabla] = filas.filter((f) => !this.coincide(f))
      if (this.tabla === 'quedadas') {
        for (const hija of HIJAS) {
          this.backend.tablas[hija] = this.backend.tablas[hija].filter((h) => filas.some((q) => q.id === h.quedada_id && this.coincide(q)) === false)
        }
      }
    }
    return { error: null }
  }
  then<T>(res: (v: { error: { message: string } | null }) => T) {
    return Promise.resolve().then(() => this.ejecutar()).then(res)
  }
}
