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

  -- Lo mínimo de realtime: la tabla de mensajes, el tema actual y broadcast_changes.
  create schema realtime;
  create table realtime.messages (
    id bigserial primary key, topic text not null, event text, payload jsonb, extension text not null default 'broadcast'
  );
  alter table realtime.messages enable row level security;
  grant usage on schema realtime to authenticated;
  grant select on realtime.messages to authenticated;
  create function realtime.topic() returns text language sql stable
    as $$ select nullif(current_setting('realtime.topic', true), '') $$;
  create function realtime.broadcast_changes(
    topic_name text, event_name text, operation text, table_name text, table_schema text,
    new record, old record, level text default 'ROW'
  ) returns void language plpgsql as $$
  begin
    insert into realtime.messages (topic, event, payload)
    values (topic_name, event_name, jsonb_build_object('operation', operation, 'table', table_name,
                                                       'record', to_jsonb(new), 'old_record', to_jsonb(old)));
  end $$;
`

/** Lo mínimo del esquema `storage` de Supabase que necesita `0007`. */
const STORAGE_FALSO = `
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (id bigserial primary key, bucket_id text not null, name text not null);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant all on storage.objects to authenticated;
  grant usage on sequence storage.objects_id_seq to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
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

async function comoEnTema(db: PGlite, usuario: string, tema: string, consulta: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${usuario}', false), set_config('realtime.topic', '${tema}', false);`)
  try {
    return await db.query<Record<string, unknown>>(consulta)
  } finally {
    await db.exec('reset role')
  }
}

const avisos = async (db: PGlite) =>
  (await db.query<{ topic: string; event: string; tabla: string }>("select topic, event, payload->>'table' as tabla from realtime.messages order by id")).rows

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
    await db.exec(sql('0003_tiempo_real.sql'))
    await db.exec(sql('0004_casa.sql'))
    await db.exec('truncate realtime.messages')
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
  describe('tiempo real (0003)', () => {
    it('avisa al tema de la quedada cuando cambia un producto: alta, cambio y borrado', async () => {
      await db.exec("insert into public.productos (quedada_id, id, posicion, grupo_id, nombre, unidad, comprado, descuento, observaciones) values ('q1','nuevo',9,'g1','Vino','',false,0,'')")
      await db.exec("update public.productos set comprado = true where quedada_id = 'q1' and id = 'nuevo'")
      await db.exec("delete from public.productos where quedada_id = 'q1' and id = 'nuevo'")
      expect(await avisos(db)).toEqual([
        { topic: 'quedada:q1', event: 'INSERT', tabla: 'productos' },
        { topic: 'quedada:q1', event: 'UPDATE', tabla: 'productos' },
        { topic: 'quedada:q1', event: 'DELETE', tabla: 'productos' },
      ])
    })

    it('avisa también de cambios en la propia quedada y en cada tabla hija', async () => {
      await db.exec("update public.quedadas set nombre = 'Otro nombre' where id = 'q1'")
      await db.exec("update public.participantes set nombre = 'Ana M.' where quedada_id = 'q1' and id = 'p1'")
      await db.exec("update public.grupos set nombre = 'Cena grande' where quedada_id = 'q1' and id = 'g1'")
      await db.exec("update public.asistentes set personas = 4 where quedada_id = 'q1' and id = 'a1'")
      await db.exec("update public.basicos set nombre = 'Papel' where quedada_id = 'q1' and id = 'b1'")
      expect((await avisos(db)).map((a) => [a.topic, a.tabla])).toEqual([
        ['quedada:q1', 'quedadas'],
        ['quedada:q1', 'participantes'],
        ['quedada:q1', 'grupos'],
        ['quedada:q1', 'asistentes'],
        ['quedada:q1', 'basicos'],
      ])
    })

    it('cada aviso va al tema de su quedada y no al de otra', async () => {
      await db.exec("update public.productos set comprado = true where quedada_id = 'q2' and id = 'pr2'")
      expect((await avisos(db)).map((a) => a.topic)).toEqual(['quedada:q2'])
    })

    it('al borrar una quedada se avisa de su borrado', async () => {
      await db.exec("delete from public.quedadas where id = 'q0'")
      expect((await avisos(db)).map((a) => [a.topic, a.event, a.tabla])).toContainEqual(['quedada:q0', 'DELETE', 'quedadas'])
    })

    it('quien tiene acceso lee los avisos de su quedada', async () => {
      await db.exec("update public.productos set comprado = true where quedada_id = 'q1' and id = 'pr2'")
      const r = await comoEnTema(db, ANA, 'quedada:q1', 'select topic from realtime.messages')
      expect(r.rows).toEqual([{ topic: 'quedada:q1' }])
    })

    it('otra cuenta no lee los avisos de una quedada ajena', async () => {
      await db.exec("update public.productos set comprado = true where quedada_id = 'q1' and id = 'pr2'")
      const r = await comoEnTema(db, LUIS, 'quedada:q1', 'select topic from realtime.messages')
      expect(r.rows).toEqual([])
    })

    it('un tema que no es de una quedada no deja leer nada', async () => {
      await db.exec("update public.productos set comprado = true where quedada_id = 'q1' and id = 'pr2'")
      const r = await comoEnTema(db, ANA, 'otra-cosa', 'select topic from realtime.messages')
      expect(r.rows).toEqual([])
    })
  })

  it('0004: las quedadas y participantes existentes quedan con la casa vacía y sin familia', async () => {
    const q = await db.query('select casa_titulo, casa_descripcion, casa_direccion, casa_latitud, casa_precio, casa_pagador_id from public.quedadas where id = $1', ['q1'])
    expect(q.rows).toEqual([{ casa_titulo: '', casa_descripcion: '', casa_direccion: '', casa_latitud: null, casa_precio: null, casa_pagador_id: null }])
    const p = await db.query('select porcentaje_casa, familia_id from public.participantes where quedada_id = $1', ['q1'])
    expect((p.rows as Record<string, unknown>[]).every((f) => f.porcentaje_casa === null && f.familia_id === null)).toBe(true)
  })

  it('0004: no admite un precio negativo y el propietario puede guardar la casa', async () => {
    await expect(db.query("update public.quedadas set casa_precio = -1 where id = 'q1'")).rejects.toThrow()
    await db.query("update public.quedadas set casa_titulo = 'Casa', casa_precio = 90000 where id = 'q1'")
    expect((await db.query("select casa_precio from public.quedadas where id = 'q1'")).rows).toEqual([{ casa_precio: 90000 }])
  })

  describe('0005: pagos de la casa', () => {
    const preparar = async (pagador: string | null, familia: string | null) => {
      await db.query('update public.quedadas set casa_precio = 90000, casa_pagador_id = $1 where id = $2', [pagador, 'q1'])
      await db.query('update public.participantes set familia_id = $1 where quedada_id = $2 and id = $3', [familia, 'q1', 'p1'])
      await db.exec(sql('0005_pagos.sql'))
    }

    it('convierte el pagador antiguo en un pago de su familia por el precio completo', async () => {
      await preparar('p1', 'a1')
      expect((await db.query('select id, familia_id, importe, concepto from public.pagos where quedada_id = $1', ['q1'])).rows).toEqual([
        { id: 'migrado-pagador', familia_id: 'a1', importe: 90000, concepto: 'Alquiler' },
      ])
      // La columna antigua no se toca.
      expect((await db.query("select casa_pagador_id from public.quedadas where id = 'q1'")).rows).toEqual([{ casa_pagador_id: 'p1' }])
    })

    it('un pagador sin familia, o sin pagador, no genera pagos', async () => {
      await preparar('p1', null)
      expect((await db.query('select count(*)::int as n from public.pagos')).rows).toEqual([{ n: 0 }])
    })

    it('no admite importes que no sean positivos', async () => {
      await preparar(null, null)
      await expect(db.query("insert into public.pagos (quedada_id, id, posicion, familia_id, importe) values ('q1','x',0,'a1',0)")).rejects.toThrow()
    })

    it('una cuenta no ve ni toca los pagos de otra, y el propietario sí', async () => {
      await preparar(null, null)
      await db.exec("insert into public.pagos (quedada_id, id, posicion, familia_id, importe, concepto) values ('q1','x',0,'a1',5000,'Reserva')")
      expect((await como(db, ANA, 'select id from public.pagos')).rows).toEqual([{ id: 'x' }])
      expect((await como(db, LUIS, 'select id from public.pagos')).rows).toEqual([])
      await expect(
        como(db, LUIS, "insert into public.pagos (quedada_id, id, posicion, familia_id, importe) values ('q1','y',1,'a1',100)"),
      ).rejects.toThrow()
      expect((await como(db, LUIS, "delete from public.pagos where quedada_id = 'q1' returning id")).rows).toEqual([])
    })

    it('un cambio en los pagos avisa al tema de la quedada', async () => {
      await preparar(null, null)
      await db.exec('truncate realtime.messages')
      await db.exec("insert into public.pagos (quedada_id, id, posicion, familia_id, importe) values ('q1','x',0,'a1',5000)")
      expect((await avisos(db)).map((a) => [a.topic, a.event, a.tabla])).toEqual([['quedada:q1', 'INSERT', 'pagos']])
    })
  })

  describe('0006: gastos', () => {
    const insertar = "insert into public.gastos (quedada_id, id, posicion, pagador_id, concepto, importe) values ('q1','g1',0,'p1','Gasolina',4550)"

    it('el propietario los ve y toca; otra cuenta no', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await como(db, ANA, insertar)
      expect((await como(db, ANA, 'select id from public.gastos')).rows).toEqual([{ id: 'g1' }])
      expect((await como(db, LUIS, 'select id from public.gastos')).rows).toEqual([])
      await expect(
        como(db, LUIS, "insert into public.gastos (quedada_id, id, posicion, pagador_id, concepto, importe) values ('q1','x',1,'p1','Intruso',100)"),
      ).rejects.toThrow()
      expect((await como(db, LUIS, "delete from public.gastos where quedada_id = 'q1' returning id")).rows).toEqual([])
    })

    it('no admite importes que no sean positivos', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await expect(db.query("insert into public.gastos (quedada_id, id, posicion, pagador_id, concepto, importe) values ('q1','x',0,'p1','Nada',0)")).rejects.toThrow()
    })

    it('un cambio avisa al tema de la quedada', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await db.exec('truncate realtime.messages')
      await db.exec(insertar)
      expect((await avisos(db)).map((a) => [a.topic, a.event, a.tabla])).toEqual([['quedada:q1', 'INSERT', 'gastos']])
    })
  })

  describe('0007: fotos de los tiques', () => {
    it('añade la ruta de la imagen al gasto, nula por defecto', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await db.exec(STORAGE_FALSO)
      await db.exec(sql('0007_tiques.sql'))
      await como(db, ANA, "insert into public.gastos (quedada_id, id, posicion, pagador_id, concepto, importe) values ('q1','g1',0,'p1','Compra',1200)")
      await como(db, ANA, "update public.gastos set imagen = 'q1/g1.jpg' where id = 'g1'")
      expect((await como(db, ANA, 'select imagen from public.gastos')).rows).toEqual([{ imagen: 'q1/g1.jpg' }])
    })

    it('crea el bucket privado con límite de tamaño', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await db.exec(STORAGE_FALSO)
      await db.exec(sql('0007_tiques.sql'))
      expect((await db.query('select id, public, file_size_limit from storage.buckets')).rows).toEqual([
        { id: 'tiques', public: false, file_size_limit: 2097152 },
      ])
    })

    it('solo el propietario de la quedada ve, sube y borra sus imágenes', async () => {
      await db.exec(sql('0006_gastos.sql'))
      await db.exec(STORAGE_FALSO)
      await db.exec(sql('0007_tiques.sql'))
      await como(db, ANA, "insert into storage.objects (bucket_id, name) values ('tiques', 'q1/g1.jpg')")
      expect((await como(db, ANA, 'select name from storage.objects')).rows).toEqual([{ name: 'q1/g1.jpg' }])
      expect((await como(db, LUIS, 'select name from storage.objects')).rows).toEqual([])
      await expect(como(db, LUIS, "insert into storage.objects (bucket_id, name) values ('tiques', 'q1/x.jpg')")).rejects.toThrow()
      expect((await como(db, LUIS, "delete from storage.objects returning name")).rows).toEqual([])
      expect((await como(db, ANA, "delete from storage.objects returning name")).rows).toEqual([{ name: 'q1/g1.jpg' }])
    })
  })
})
