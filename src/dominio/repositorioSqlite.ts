import type { Database, SqlJsStatic, SqlValue } from 'sql.js'
import type { Persistencia } from './persistencia'
import type { Repositorio } from './repositorio'
import type { Id, Quedada } from './tipos'

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS quedadas (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, inicio TEXT, fin TEXT
);
CREATE TABLE IF NOT EXISTS participantes (
  quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
  id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL,
  porcentaje_comida REAL, paga_casa INTEGER,
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
      this.bd.run('INSERT INTO quedadas VALUES (?,?,?,?)', [q.id, q.nombre, q.inicio, q.fin])
      q.participantes.forEach((p, i) => this.bd.run('INSERT INTO participantes VALUES (?,?,?,?,?,?)', [
          q.id, p.id, i, p.nombre, p.porcentajeComida ?? null, p.pagaCasa === undefined ? null : p.pagaCasa ? 1 : 0,
        ]))
      q.grupos.forEach((g, i) => this.bd.run('INSERT INTO grupos VALUES (?,?,?,?,?,?)', [q.id, g.id, i, g.nombre, g.orden, g.reparto ?? null]))
      q.productos.forEach((p, i) =>
        this.bd.run('INSERT INTO productos VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
          q.id, p.id, i, p.grupoId, p.nombre, p.cantidad, p.unidad, p.compradorId,
          p.comprado ? 1 : 0, p.precioUnidad, p.descuento, p.observaciones,
        ]),
      )
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
    const [q] = this.filas('SELECT nombre, inicio, fin FROM quedadas WHERE id = ?', [id])
    return {
      id,
      nombre: String(q[0]),
      inicio: q[1] as string | null,
      fin: q[2] as string | null,
      participantes: this.filas('SELECT id, nombre, porcentaje_comida, paga_casa FROM participantes WHERE quedada_id = ? ORDER BY posicion', [id]).map((f) => ({
        id: String(f[0]),
        nombre: String(f[1]),
        ...(f[2] !== null && { porcentajeComida: Number(f[2]) }),
        ...(f[3] !== null && { pagaCasa: f[3] === 1 }),
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
    }
  }
}
