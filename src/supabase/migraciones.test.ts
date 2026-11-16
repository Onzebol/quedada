// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'

const sql = (nombre: string) => readFileSync(new URL(`../../supabase/migrations/${nombre}`, import.meta.url), 'utf8')

const ANA = '00000000-0000-0000-0000-00000000000a'
const LUIS = '00000000-0000-0000-0000-00000000000b'

/** Lo mínimo del esquema `auth` de Supabase que necesitan las migraciones. */
const SUPABASE_FALSO = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  alter default privileges in schema public grant all on tables to authenticated;
`

const quedadaCompleta = {
  id: 'q1',
  nombre: 'Almunia 2026',
  inicio: '2026-12-04',
  fin: null,
  participantes: [
    { id: 'p1', nombre: 'Ana', porcentajeComida: 100, pagaCasa: true, cuentaId: ANA },
    { id: 'p2', nombre: 'Peque', porcentajeComida: 0, pagaCasa: false },
  ],
  grupos: [{ id: 'g1', nombre: 'Cena del viernes', orden: 0, reparto: 'comida' }],
  productos: [
    { id: 'pr1', grupoId: 'g1', nombre: 'Leche', cantidad: 2.5, unidad: 'L', compradorId: 'p1', comprado: true, precioUnidad: 1.1, descuento: -0.2, observaciones: 'entera' },
    { id: 'pr2', grupoId: 'g1', nombre: 'Pan', cantidad: null, unidad: '', compradorId: null, comprado: false, precioUnidad: null, descuento: 0, observaciones: '' },
  ],
  asistentes: [{ id: 'a1', familia: 'Pérez', personas: 3, llegada: '18:30' }],
  basicos: [{ id: 'b1', nombre: 'Lavavajillas', asistenteId: 'a1' }],
}

// Una quedada guardada antes de existir asistentes y básicos (hito 7): le faltan esas dos listas.
const quedadaAntigua = { id: 'q0', nombre: 'Almunia 2025', inicio: null, fin: null, participantes: [], grupos: [], productos: [] }

async function como(db: PGlite, usuario: string, consulta: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${usuario}', false);`)
  try {
    return await db.query<Record<string, unknown>>(consulta)
  } finally {
    await db.exec('reset role')
  }
}

describe('migraciones de Supabase', () => {
  let db: PGlite

  beforeEach(async () => {
    db = new PGlite()
    await db.exec(SUPABASE_FALSO)
    await db.exec(`insert into auth.users values ('${ANA}'), ('${LUIS}')`)
    await db.exec(sql('0001_quedadas.sql'))
    await db.query('insert into public.quedadas (id, propietario_id, datos) values ($1,$2,$3), ($4,$2,$5)', [
      'q1', ANA, JSON.stringify(quedadaCompleta), 'q0', JSON.stringify(quedadaAntigua),
    ])
    await db.query('insert into public.quedadas (id, propietario_id, datos) values ($1,$2,$3)', [
      'q2', LUIS, JSON.stringify({ ...quedadaCompleta, id: 'q2', nombre: 'De Luis' }),
    ])
    await db.exec(sql('0002_tablas.sql'))
  })

  it('convierte las quedadas existentes en filas', async () => {
    const q = await db.query('select nombre, inicio, fin from public.quedadas where id = $1', ['q1'])
    expect(q.rows).toEqual([{ nombre: 'Almunia 2026', inicio: '2026-12-04', fin: null }])

    const productos = await db.query('select id, posicion, cantidad, comprado, descuento, comprador_id from public.productos where quedada_id = $1 order by posicion', ['q1'])
    expect(productos.rows).toEqual([
      { id: 'pr1', posicion: 0, cantidad: 2.5, comprado: true, descuento: -0.2, comprador_id: 'p1' },
      { id: 'pr2', posicion: 1, cantidad: null, comprado: false, descuento: 0, comprador_id: null },
    ])

    const participantes = await db.query('select id, porcentaje_comida, paga_casa, cuenta_id from public.participantes where quedada_id = $1 order by posicion', ['q1'])
    expect(participantes.rows).toEqual([
      { id: 'p1', porcentaje_comida: 100, paga_casa: true, cuenta_id: ANA },
      { id: 'p2', porcentaje_comida: 0, paga_casa: false, cuenta_id: null },
    ])

    expect((await db.query('select familia, personas, llegada from public.asistentes where quedada_id = $1', ['q1'])).rows).toEqual([{ familia: 'Pérez', personas: 3, llegada: '18:30' }])
    expect((await db.query('select nombre, asistente_id from public.basicos where quedada_id = $1', ['q1'])).rows).toEqual([{ nombre: 'Lavavajillas', asistente_id: 'a1' }])
    expect((await db.query('select nombre, reparto from public.grupos where quedada_id = $1', ['q1'])).rows).toEqual([{ nombre: 'Cena del viernes', reparto: 'comida' }])
  })

  it('convierte una quedada antigua sin asistentes ni básicos', async () => {
    const q = await db.query('select nombre from public.quedadas where id = $1', ['q0'])
    expect(q.rows).toEqual([{ nombre: 'Almunia 2025' }])
    expect((await db.query('select count(*)::int as n from public.asistentes where quedada_id = $1', ['q0'])).rows).toEqual([{ n: 0 }])
  })

  it('al volver a ejecutar la conversión no pisa lo que se haya cambiado en las tablas', async () => {
    await db.exec("update public.productos set comprado = false, nombre = 'Leche semi' where quedada_id = 'q1' and id = 'pr1'")
    await db.exec('select public.convertir_quedadas_desde_datos()')
    const p = await db.query('select nombre, comprado from public.productos where quedada_id = $1 and id = $2', ['q1', 'pr1'])
    expect(p.rows).toEqual([{ nombre: 'Leche semi', comprado: false }])
  })

  it('al volver a ejecutarla recoge lo que la versión anterior guardó en datos', async () => {
    const nueva = { ...quedadaCompleta, nombre: 'Almunia (renombrada)', productos: [quedadaCompleta.productos[1]] }
    await db.query('update public.quedadas set datos = $1 where id = $2', [JSON.stringify(nueva), 'q1'])
    await db.exec('select public.convertir_quedadas_desde_datos()')
    expect((await db.query('select nombre from public.quedadas where id = $1', ['q1'])).rows).toEqual([{ nombre: 'Almunia (renombrada)' }])
    expect((await db.query('select id from public.productos where quedada_id = $1', ['q1'])).rows).toEqual([{ id: 'pr2' }])
  })

  it('una quedada nueva sin datos se puede crear', async () => {
    await como(db, ANA, "insert into public.quedadas (id, nombre) values ('q9', 'Nueva')")
    expect((await db.query('select nombre from public.quedadas where id = $1', ['q9'])).rows).toEqual([{ nombre: 'Nueva' }])
  })

  it('cada cuenta ve solo las filas de sus quedadas', async () => {
    expect((await como(db, ANA, 'select id from public.productos order by id')).rows).toEqual([{ id: 'pr1' }, { id: 'pr2' }])
    expect((await como(db, LUIS, 'select quedada_id from public.productos group by quedada_id')).rows).toEqual([{ quedada_id: 'q2' }])
    expect((await como(db, ANA, 'select id from public.basicos')).rows).toHaveLength(1)
  })

  it('una cuenta no puede añadir ni cambiar filas en la quedada de otra', async () => {
    await expect(
      como(db, LUIS, "insert into public.productos (quedada_id, id, posicion, grupo_id, nombre, unidad, comprado, descuento, observaciones) values ('q1','x',9,'g1','Intruso','',false,0,'')"),
    ).rejects.toThrow()
    const cambiadas = await como(db, LUIS, "update public.productos set comprado = false where quedada_id = 'q1' returning id")
    expect(cambiadas.rows).toEqual([])
    expect((await db.query("select comprado from public.productos where quedada_id = 'q1' and id = 'pr1'")).rows).toEqual([{ comprado: true }])
    const borradas = await como(db, LUIS, "delete from public.productos where quedada_id = 'q1' returning id")
    expect(borradas.rows).toEqual([])
  })

  it('la conversión no se puede llamar desde la API', async () => {
    await expect(como(db, ANA, 'select public.convertir_quedadas_desde_datos()')).rejects.toThrow()
  })
})
