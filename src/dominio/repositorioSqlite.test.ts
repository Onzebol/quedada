import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PersistenciaMemoria } from '../test/persistenciaMemoria'
import { producto, quedada } from './fabrica'
import { RepositorioSqlite } from './repositorioSqlite'

let sql: SqlJsStatic
beforeAll(async () => {
  sql = await initSqlJs()
})

describe('RepositorioSqlite', () => {
  let persistencia: PersistenciaMemoria
  const abrir = () => RepositorioSqlite.abrir(sql, persistencia)
  beforeEach(() => {
    persistencia = new PersistenciaMemoria()
  })

  it('empieza sin quedadas', async () => {
    expect(await (await abrir()).listar()).toEqual([])
  })

  it('guarda y recupera una quedada completa, con el orden de sus listas', async () => {
    const q = quedada({
      id: 'q1',
      nombre: 'Almunia 2026',
      inicio: '2026-05-01',
      fin: '2026-05-03',
      participantes: [
        { id: 'u2', nombre: 'Zoe' },
        { id: 'u1', nombre: 'Ana' },
      ],
      grupos: [
        { id: 'g2', nombre: 'Cena', orden: 1 },
        { id: 'g1', nombre: 'Desayuno', orden: 0 },
      ],
      productos: [
        producto({ id: 'p2', grupoId: 'g2', nombre: 'Pan', cantidad: 2.254, unidad: 'kg', compradorId: 'u1', comprado: true, precioUnidad: 1.5, descuento: -0.3, observaciones: 'integral' }),
        producto({ id: 'p1', grupoId: 'g1', nombre: 'Leche', cantidad: null }),
      ],
    })
    const repo = await abrir()
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('guarda la casa y las familias de los participantes', async () => {
    const q = quedada({
      id: 'q1',
      casa: { titulo: 'Casa Almunia', descripcion: 'Ver https://x.es', direccion: 'Calle 1', latitud: 41.6, longitud: -1.2, precio: 90050, pagadorId: 'u1' },
      participantes: [{ id: 'u1', nombre: 'Ana', porcentajeCasa: 50, familiaId: 'f1' }],
      asistentes: [{ id: 'f1', familia: 'Pérez', personas: 1, llegada: null }],
    })
    const repo = await abrir()
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('abre una base antigua (sin casa ni familias) y la completa', async () => {
    const vieja = new sql.Database()
    vieja.run('CREATE TABLE quedadas (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, inicio TEXT, fin TEXT)')
    vieja.run(`CREATE TABLE participantes (quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
      id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL,
      porcentaje_comida REAL, paga_casa INTEGER, cuenta_id TEXT, PRIMARY KEY (quedada_id, id))`)
    vieja.run("INSERT INTO quedadas VALUES ('q1', 'Vieja', NULL, NULL)")
    vieja.run("INSERT INTO participantes VALUES ('q1', 'u1', 0, 'Ana', NULL, NULL, NULL)")
    await persistencia.guardar(vieja.export())
    const repo = await abrir()
    const leida = (await repo.obtener('q1'))!
    expect(leida.casa).toEqual({ titulo: '', descripcion: '', direccion: '', latitud: null, longitud: null, precio: null, pagadorId: null })
    await repo.guardar({ ...leida, casa: { ...leida.casa, precio: 100 }, participantes: [{ id: 'u1', nombre: 'Ana', familiaId: 'f1' }] })
    expect((await repo.obtener('q1'))!.participantes[0].familiaId).toBe('f1')
  })

  it('guarda los campos de reparto de participantes y comidas', async () => {
    const q = quedada({
      id: 'q1',
      participantes: [
        { id: 'u1', nombre: 'Ana', porcentajeComida: 50, pagaCasa: false },
        { id: 'u2', nombre: 'Luis' },
      ],
      grupos: [
        { id: 'g1', nombre: 'Alquiler', orden: 0, reparto: 'casa' },
        { id: 'g2', nombre: 'Cena', orden: 1 },
      ],
    })
    const repo = await abrir()
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('guarda asistentes y básicos con su orden y asignación', async () => {
    const q = quedada({
      id: 'q1',
      asistentes: [
        { id: 'a2', familia: 'Gil', personas: 3, llegada: null },
        { id: 'a1', familia: 'Pérez', personas: 4, llegada: '18:30' },
      ],
      basicos: [
        { id: 'b2', nombre: 'Lavavajillas', asistenteId: null },
        { id: 'b1', nombre: 'Leche', asistenteId: 'a1' },
      ],
    })
    const repo = await abrir()
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('abre una base creada antes de los asistentes sin perder datos', async () => {
    const antigua = new sql.Database()
    antigua.run('CREATE TABLE quedadas (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, inicio TEXT, fin TEXT)')
    antigua.run("INSERT INTO quedadas VALUES ('q1','Vieja',NULL,NULL)")
    await persistencia.guardar(antigua.export())
    const q = await (await abrir()).obtener('q1')
    expect(q).toMatchObject({ nombre: 'Vieja', asistentes: [], basicos: [] })
  })

  it('guarda la cuenta vinculada a un participante', async () => {
    const q = quedada({ id: 'q1', participantes: [{ id: 'u1', nombre: 'Ana', cuentaId: 'g-1' }, { id: 'u2', nombre: 'Luis' }] })
    const repo = await abrir()
    await repo.guardar(q)
    expect(await repo.obtener('q1')).toEqual(q)
  })

  it('abre una base de participantes anterior a las cuentas y añade la columna', async () => {
    const antigua = new sql.Database()
    antigua.run('CREATE TABLE quedadas (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, inicio TEXT, fin TEXT)')
    antigua.run(`CREATE TABLE participantes (
      quedada_id TEXT NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
      id TEXT NOT NULL, posicion INTEGER NOT NULL, nombre TEXT NOT NULL,
      porcentaje_comida REAL, paga_casa INTEGER, PRIMARY KEY (quedada_id, id))`)
    antigua.run("INSERT INTO quedadas VALUES ('q1','Vieja',NULL,NULL)")
    antigua.run("INSERT INTO participantes VALUES ('q1','u1',0,'Ana',NULL,NULL)")
    await persistencia.guardar(antigua.export())
    const repo = await abrir()
    expect((await repo.obtener('q1'))?.participantes).toEqual([{ id: 'u1', nombre: 'Ana' }])
    const q = (await repo.obtener('q1'))!
    await repo.guardar({ ...q, participantes: [{ id: 'u1', nombre: 'Ana', cuentaId: 'g-1' }] })
    expect((await (await abrir()).obtener('q1'))?.participantes[0].cuentaId).toBe('g-1')
  })

  it('persiste: otra instancia sobre la misma persistencia ve los datos', async () => {
    await (await abrir()).guardar(quedada({ id: 'q1' }))
    expect(await (await abrir()).listar()).toHaveLength(1)
  })

  it('guardar con un id existente la reemplaza, incluidos sus productos', async () => {
    const repo = await abrir()
    await repo.guardar(quedada({ id: 'q1', nombre: 'Antes', productos: [producto({ id: 'p1' }), producto({ id: 'p2' })] }))
    await repo.guardar(quedada({ id: 'q1', nombre: 'Después', productos: [producto({ id: 'p1' })] }))
    const todas = await repo.listar()
    expect(todas).toHaveLength(1)
    expect(todas[0].nombre).toBe('Después')
    expect(todas[0].productos).toHaveLength(1)
  })

  it('obtener devuelve null si no existe', async () => {
    expect(await (await abrir()).obtener('nada')).toBeNull()
  })

  it('borra una quedada y deja las demás', async () => {
    const repo = await abrir()
    await repo.guardar(quedada({ id: 'q1', productos: [producto({ id: 'p1' })] }))
    await repo.guardar(quedada({ id: 'q2', productos: [producto({ id: 'p2' })] }))
    await repo.borrar('q1')
    expect((await repo.listar()).map((q) => q.id)).toEqual(['q2'])
  })

  it('borrar algo que no existe no falla', async () => {
    await expect((await abrir()).borrar('nada')).resolves.toBeUndefined()
  })

  it('guarda los datos como una base SQLite real', async () => {
    await (await abrir()).guardar(quedada({ id: 'q1' }))
    const bd = new sql.Database(persistencia.bytes!)
    expect(bd.exec('SELECT COUNT(*) FROM quedadas')[0].values[0][0]).toBe(1)
  })
})
