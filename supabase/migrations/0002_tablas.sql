-- Paso 1 de #29: una fila por cosa en vez de la quedada entera en `datos`.
-- Así dos personas que tocan cosas distintas no se pisan. `datos` se conserva (ya sin `not null`)
-- hasta comprobar los recuentos; se borrará en otra migración.

-- Orden al aplicarla: ejecutar esta migración, fusionar la PR y volver a ejecutar
--   select public.convertir_quedadas_desde_datos();
-- una vez, para recoger lo que la versión anterior de la app guardó en `datos` entre medias.

alter table public.quedadas
  add column nombre text not null default '',
  add column inicio text,
  add column fin text,
  add column datos_convertidos jsonb;

alter table public.quedadas alter column datos drop not null;

create table public.participantes (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  nombre text not null,
  porcentaje_comida double precision,
  paga_casa boolean,
  cuenta_id text,
  primary key (quedada_id, id)
);

create table public.grupos (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  nombre text not null,
  orden integer not null,
  reparto text check (reparto in ('casa', 'comida')),
  primary key (quedada_id, id)
);

create table public.productos (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  grupo_id text not null,
  nombre text not null,
  cantidad double precision,
  unidad text not null,
  comprador_id text,
  comprado boolean not null,
  precio_unidad double precision,
  descuento double precision not null,
  observaciones text not null,
  primary key (quedada_id, id)
);

create table public.asistentes (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  familia text not null,
  personas integer not null,
  llegada text,
  primary key (quedada_id, id)
);

create table public.basicos (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  nombre text not null,
  asistente_id text,
  primary key (quedada_id, id)
);

-- Quién puede tocar las filas de una quedada. Hoy, su propietario; en el paso 3 de #29 se
-- redefine para incluir a los miembros sin tocar las políticas. `security definer` + `search_path`
-- vacío: nombres siempre calificados.
create function public.puede_acceder(p_quedada_id text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.quedadas q
    where q.id = p_quedada_id and q.propietario_id = (select auth.uid())
  )
$$;

revoke execute on function public.puede_acceder(text) from public, anon;
grant execute on function public.puede_acceder(text) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['participantes', 'grupos', 'productos', 'asistentes', 'basicos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index %I on public.%I (quedada_id)', t || '_quedada_idx', t);
    execute format(
      'create policy "ver" on public.%I for select to authenticated using (public.puede_acceder(quedada_id))', t);
    execute format(
      'create policy "crear" on public.%I for insert to authenticated with check (public.puede_acceder(quedada_id))', t);
    execute format(
      'create policy "editar" on public.%I for update to authenticated using (public.puede_acceder(quedada_id)) with check (public.puede_acceder(quedada_id))', t);
    execute format(
      'create policy "borrar" on public.%I for delete to authenticated using (public.puede_acceder(quedada_id))', t);
  end loop;
end $$;

-- Convierte `datos` (jsonb) en filas. Solo toca las quedadas cuyo `datos` ha cambiado desde la
-- última conversión, así que volver a ejecutarla no pisa lo que la app nueva haya escrito en las
-- tablas (la app nueva no escribe `datos`). Tolera quedadas antiguas sin `asistentes` ni `basicos`.
create function public.convertir_quedadas_desde_datos() returns integer
language plpgsql set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id, datos from public.quedadas
    where datos is not null and datos is distinct from datos_convertidos
  loop
    update public.quedadas
      set nombre = coalesce(r.datos->>'nombre', ''),
          inicio = r.datos->>'inicio',
          fin = r.datos->>'fin',
          datos_convertidos = r.datos
      where id = r.id;

    delete from public.participantes where quedada_id = r.id;
    delete from public.grupos where quedada_id = r.id;
    delete from public.productos where quedada_id = r.id;
    delete from public.asistentes where quedada_id = r.id;
    delete from public.basicos where quedada_id = r.id;

    insert into public.participantes (quedada_id, id, posicion, nombre, porcentaje_comida, paga_casa, cuenta_id)
    select r.id, e.v->>'id', (e.n - 1)::integer, coalesce(e.v->>'nombre', ''),
           (e.v->>'porcentajeComida')::double precision, (e.v->>'pagaCasa')::boolean, e.v->>'cuentaId'
    from jsonb_array_elements(coalesce(r.datos->'participantes', '[]'::jsonb)) with ordinality as e(v, n);

    insert into public.grupos (quedada_id, id, posicion, nombre, orden, reparto)
    select r.id, e.v->>'id', (e.n - 1)::integer, coalesce(e.v->>'nombre', ''),
           coalesce((e.v->>'orden')::integer, (e.n - 1)::integer), e.v->>'reparto'
    from jsonb_array_elements(coalesce(r.datos->'grupos', '[]'::jsonb)) with ordinality as e(v, n);

    insert into public.productos (quedada_id, id, posicion, grupo_id, nombre, cantidad, unidad,
                                  comprador_id, comprado, precio_unidad, descuento, observaciones)
    select r.id, e.v->>'id', (e.n - 1)::integer, coalesce(e.v->>'grupoId', ''), coalesce(e.v->>'nombre', ''),
           (e.v->>'cantidad')::double precision, coalesce(e.v->>'unidad', ''), e.v->>'compradorId',
           coalesce((e.v->>'comprado')::boolean, false), (e.v->>'precioUnidad')::double precision,
           coalesce((e.v->>'descuento')::double precision, 0), coalesce(e.v->>'observaciones', '')
    from jsonb_array_elements(coalesce(r.datos->'productos', '[]'::jsonb)) with ordinality as e(v, n);

    insert into public.asistentes (quedada_id, id, posicion, familia, personas, llegada)
    select r.id, e.v->>'id', (e.n - 1)::integer, coalesce(e.v->>'familia', ''),
           coalesce((e.v->>'personas')::integer, 1), e.v->>'llegada'
    from jsonb_array_elements(coalesce(r.datos->'asistentes', '[]'::jsonb)) with ordinality as e(v, n);

    insert into public.basicos (quedada_id, id, posicion, nombre, asistente_id)
    select r.id, e.v->>'id', (e.n - 1)::integer, coalesce(e.v->>'nombre', ''), e.v->>'asistenteId'
    from jsonb_array_elements(coalesce(r.datos->'basicos', '[]'::jsonb)) with ordinality as e(v, n);

    n := n + 1;
  end loop;
  return n;
end $$;

-- Solo desde el editor SQL: que no se pueda llamar por la API.
revoke execute on function public.convertir_quedadas_desde_datos() from public, anon, authenticated;

select public.convertir_quedadas_desde_datos();
