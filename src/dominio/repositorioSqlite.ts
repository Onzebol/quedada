import type { Database, SqlJsStatic, SqlValue } from 'sql.js'
import type { Persistencia } from './persistencia'
import type { Repositorio } from './repositorio'
import type { Id, Quedada } from './tipos'

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS quedadas (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, inicio TEXT, fin TEXT,
  casa_titulo TEXT, casa_descripcion TEXT, casa_direccion TEXT,
  casa_latitud REAL, casa_longitud REAL, casa_precio INTEGER, casa_pagador_id TEXT
);
CREATE TABLE IF NOT EXISTS participantes (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL,
  porcentaje_comida REAL, paga_casa INTEGER, cuenta_id TEXT, porcentaje_casa REAL, familia_id TEXT,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS grupos (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL, orden INTEGER NOT NULL, reparto TEXT,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS productos (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, grupo_id TEXT NOT NULL, nombre TEXT NOT NULL,
  cantidad REAL, unidad TEXT NOT NULL, comprador_id TEXT, comprado INTEGER NOT NULL,
  precio_unidad REAL, descuento REAL NOT NULL, observaciones TEXT NOT NULL,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS asistentes (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, familia TEXT NOT NULL, personas INTEGER NOT NULL, llegada TEXT,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS basicos (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL, asistente_id TEXT,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS pagos (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, familia_id TEXT NOT NULL, importe INTEGER NOT NULL, concepto TEXT NOT NULL,
  PRIMARY KEY (quedada_id, id)
);
CREATE TABLE IF NOT EXISTS gastos (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, pagador_id TEXT NOT NULL, concepto TEXT NOT NULL, importe INTEGER NOT NULL,
  PRIMARY KEY (quedada_id, id)
);
`

/** Repositorio sobre SQLite (sql.js, WebAssembly). Cada escritura persiste la base entera. */
export class RepositorioSqlite implements Repositorio {
  private readonly bd: Database
  private readonly persistencia: Persistencia

  private constructor(bd: Database, persistencia: Persistencia) {
    this.bd = bd
    this.persistencia = persistencia
  }

  static async abrir(sql: SqlJsStatic, persistencia: Persistencia): Promise<RepositorioSqlite> {
    const bytes = await persistencia.cargar()
    const bd = bytes ? new sql.Database(bytes) : new sql.Database()
    bd.run('PRAGMA foreign_keys = ON')
    bd.run(ESQUEMA)
    // Bases creadas antes de vincular cuentas: CREATE IF NOT EXISTS no añade columnas.
    const columnas = bd.exec('PRAGMA table_info(participantes)')[0]?.values.map((f) => f[1]) ?? []
    if (!columnas.includes('cuenta_id')) bd.run('ALTER TABLE participantes ADD COLUMN cuenta_id TEXT')
    // Bases creadas antes de la ficha de la casa y de las familias (#56).
    for (const [columna, tipo] of [['porcentaje_casa', 'REAL'], ['familia_id', 'TEXT']]) {
      if (!columnas.includes(columna)) bd.run(`ALTER TABLE participantes ADD COLUMN ${columna} ${tipo}`)
    }
    const deQuedadas = bd.exec('PRAGMA table_info(quedadas)')[0]?.values.map((f) => f[1]) ?? []
    for (const [columna, tipo] of [
      ['casa_titulo', 'TEXT'], ['casa_descripcion', 'TEXT'], ['casa_direccion', 'TEXT'],
      ['casa_latitud', 'REAL'], ['casa_longitud', 'REAL'], ['casa_precio', 'INTEGER'], ['casa_pagador_id', 'TEXT'],
    ]) {
      if (!deQuedadas.includes(columna)) bd.run(`ALTER TABLE quedadas ADD COLUMN ${columna} ${tipo}`)
    }
    return new RepositorioSqlite(bd, persistencia)
  }

  async listar(): Promise<Quedada[]> {
    return this.filas('SELECT id FROM quedadas ORDER BY rowid').map((f) => this.leer(String(f[0])))
  }

  async obtener(id: Id): Promise<Quedada | null> {
    const hay = this.filas('SELECT 1 FROM quedadas WHERE id = ?', [id]).length > 0
    return hay ? this.leer(id) : null
  }

  async guardar(q: Quedada): Promise<void> {
    this.bd.run('BEGIN')
    try {
      this.bd.run('DELETE FROM quedadas WHERE id = ?', [q.id])
      this.bd.run(
        `INSERT INTO quedadas (id, nombre, inicio, fin, casa_titulo, casa_descripcion, casa_direccion,
          casa_latitud, casa_longitud, casa_precio) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [q.id, q.nombre, q.inicio, q.fin, q.casa.titulo, q.casa.descripcion, q.casa.direccion, q.casa.latitud, q.casa.longitud, q.casa.precio],
      )
      q.participantes.forEach((p, i) =>
        this.bd.run(
          `INSERT INTO participantes (quedada_id, id, posicion, nombre, porcentaje_comida, paga_casa, cuenta_id, porcentaje_casa, familia_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [q.id, p.id, i, p.nombre, p.porcentajeComida ?? null, p.pagaCasa === undefined ? null : p.pagaCasa ? 1 : 0, p.cuentaId ?? null, p.porcentajeCasa ?? null, p.familiaId ?? null],
        ),
      )
      q.grupos.forEach((g, i) => this.bd.run('INSERT INTO grupos VALUES (?,?,?,?,?,?)', [q.id, g.id, i, g.nombre, g.orden, g.reparto ?? null]))
      q.productos.forEach((p, i) =>
        this.bd.run('INSERT INTO productos VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
          q.id, p.id, i, p.grupoId, p.nombre, p.cantidad, p.unidad, p.compradorId,
          p.comprado ? 1 : 0, p.precioUnidad, p.descuento, p.observaciones,
        ]),
      )
      q.asistentes.forEach((a, i) => this.bd.run('INSERT INTO asistentes VALUES (?,?,?,?,?,?)', [q.id, a.id, i, a.familia, a.personas, a.llegada]))
      q.basicos.forEach((b, i) => this.bd.run('INSERT INTO basicos VALUES (?,?,?,?,?)', [q.id, b.id, i, b.nombre, b.asistenteId]))
      for (const [i, p] of (q.pagos ?? []).entries()) {
        this.bd.run('INSERT INTO pagos VALUES (?,?,?,?,?,?)', [q.id, p.id, i, p.familiaId, p.importe, p.concepto])
      }
      q.gastos.forEach((g, i) => this.bd.run('INSERT INTO gastos VALUES (?,?,?,?,?,?)', [q.id, g.id, i, g.pagadorId, g.concepto, g.importe]))
      this.bd.run('COMMIT')
    } catch (error) {
      this.bd.run('ROLLBACK')
      throw error
    }
    await this.persistir()
  }

  async borrar(id: Id): Promise<void> {
    this.bd.run('DELETE FROM quedadas WHERE id = ?', [id])
    await this.persistir()
  }

  private persistir(): Promise<void> {
    return this.persistencia.guardar(this.bd.export())
  }

  private filas(consulta: string, parametros: SqlValue[] = []): SqlValue[][] {
    return this.bd.exec(consulta, parametros)[0]?.values ?? []
  }

  private leer(id: Id): Quedada {
    const [q] = this.filas(
      'SELECT nombre, inicio, fin, casa_titulo, casa_descripcion, casa_direccion, casa_latitud, casa_longitud, casa_precio FROM quedadas WHERE id = ?',
      [id],
    )
    return {
      id,
      nombre: String(q[0]),
      inicio: q[1] as string | null,
      fin: q[2] as string | null,
      casa: {
        titulo: String(q[3] ?? ''),
        descripcion: String(q[4] ?? ''),
        direccion: String(q[5] ?? ''),
        latitud: q[6] as number | null,
        longitud: q[7] as number | null,
        precio: q[8] as number | null,
      },
      participantes: this.filas('SELECT id, nombre, porcentaje_comida, paga_casa, cuenta_id, porcentaje_casa, familia_id FROM participantes WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        nombre: String(f[1]),
        ...(f[2] !== null && { porcentajeComida: Number(f[2]) }),
        ...(f[3] !== null && { pagaCasa: f[3] === 1 }),
        ...(f[4] !== null && { cuentaId: String(f[4]) }),
        ...(f[5] !== null && { porcentajeCasa: Number(f[5]) }),
        ...(f[6] !== null && { familiaId: String(f[6]) }),
      })),
      grupos: this.filas('SELECT id, nombre, orden, reparto FROM grupos WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        nombre: String(f[1]),
        orden: Number(f[2]),
        ...(f[3] !== null && { reparto: f[3] as 'casa' | 'comida' }),
      })),
      productos: this.filas(
        'SELECT id, grupo_id, nombre, cantidad, unidad, comprador_id, comprado, precio_unidad, descuento, observaciones FROM productos WHERE quedada_id = ? ORDER BY posicion',
        [id],
      ).map((f) => ({
        id: String(f[0]),
        grupoId: String(f[1]),
        nombre: String(f[2]),
        cantidad: f[3] as number | null,
        unidad: String(f[4]),
        compradorId: f[5] as string | null,
        comprado: f[6] === 1,
        precioUnidad: f[7] as number | null,
        descuento: Number(f[8]),
        observaciones: String(f[9]),
      })),
      asistentes: this.filas('SELECT id, familia, personas, llegada FROM asistentes WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        familia: String(f[1]),
        personas: Number(f[2]),
        llegada: f[3] as string | null,
      })),
      basicos: this.filas('SELECT id, nombre, asistente_id FROM basicos WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        nombre: String(f[1]),
        asistenteId: f[2] as string | null,
      })),
      pagos: this.filas('SELECT id, familia_id, importe, concepto FROM pagos WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        familiaId: String(f[1]),
        importe: Number(f[2]),
        concepto: String(f[3]),
      })),
      gastos: this.filas('SELECT id, pagador_id, concepto, importe FROM gastos WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        pagadorId: String(f[1]),
        concepto: String(f[2]),
        importe: Number(f[3]),
      })),
    }
  }
}
