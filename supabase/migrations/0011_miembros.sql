-- Paso 3 de #29 (#132): las quedadas se pueden compartir con miembros.
-- Todos los miembros leen y editan la quedada; solo el propietario añade y retira miembros y
-- borra la quedada. Solo añade una tabla y redefine funciones y políticas: se puede ejecutar
-- antes de fusionar la PR sin romper la versión anterior de la app.

create table public.quedada_miembros (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (quedada_id, usuario_id)
);

create index quedada_miembros_usuario_idx on public.quedada_miembros (usuario_id);

-- Quién es el propietario. `security definer` + `search_path` vacío: nombres siempre calificados.
create function public.es_propietario(p_quedada_id text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.quedadas q
    where q.id = p_quedada_id and q.propietario_id = (select auth.uid())
  )
$$;

-- Quién puede tocar las filas de una quedada: su propietario y sus miembros. Se redefine sin
-- tocar las políticas de las tablas hijas, del bucket de tiques ni de Realtime, que ya la usan.
-- `security definer` evita la recursión entre las políticas de `quedadas` y `quedada_miembros`.
create or replace function public.puede_acceder(p_quedada_id text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.quedadas q
    where q.id = p_quedada_id and q.propietario_id = (select auth.uid())
  ) or exists (
    select 1 from public.quedada_miembros m
    where m.quedada_id = p_quedada_id and m.usuario_id = (select auth.uid())
  )
$$;

revoke execute on function public.es_propietario(text) from public, anon;
grant execute on function public.es_propietario(text) to authenticated;
revoke execute on function public.puede_acceder(text) from public, anon;
grant execute on function public.puede_acceder(text) to authenticated;

alter table public.quedada_miembros enable row level security;

-- El propietario ve a todos; cada miembro, solo su propia fila.
create policy "ver miembros" on public.quedada_miembros
  for select to authenticated
  using (usuario_id = (select auth.uid()) or public.es_propietario(quedada_id));

create policy "añadir miembros" on public.quedada_miembros
  for insert to authenticated with check (public.es_propietario(quedada_id));

-- El propietario retira a cualquiera; un miembro puede salirse.
create policy "retirar miembros" on public.quedada_miembros
  for delete to authenticated
  using (usuario_id = (select auth.uid()) or public.es_propietario(quedada_id));

-- `quedadas`: los miembros la ven y la editan; crear y borrar siguen siendo del propietario.
drop policy "ver las propias" on public.quedadas;
drop policy "editar las propias" on public.quedadas;

create policy "ver las propias y compartidas" on public.quedadas
  for select to authenticated using (public.puede_acceder(id));

create policy "editar las propias y compartidas" on public.quedadas
  for update to authenticated
  using (public.puede_acceder(id))
  with check (public.puede_acceder(id));

-- Un miembro no puede quedarse con la quedada: el propietario no cambia nunca.
create function public.no_cambiar_propietario() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.propietario_id is distinct from old.propietario_id then
    raise exception 'El propietario de una quedada no se puede cambiar';
  end if;
  return new;
end $$;

create trigger quedadas_propietario_fijo before update on public.quedadas
  for each row execute function public.no_cambiar_propietario();
