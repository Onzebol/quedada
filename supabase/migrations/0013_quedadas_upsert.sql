-- #150: crear una quedada con `upsert` (insert … on conflict do update) fallaba con «new row violates
-- row-level security policy» desde 0011: Postgres comprueba las políticas de select y update sobre la fila
-- recién insertada, y `puede_acceder(id)` (que consulta `quedadas`) todavía no la ve. En `quedadas`, el
-- propietario se comprueba en línea y los miembros con `es_miembro`, que no consulta `quedadas`.
-- Solo cambia dos políticas y añade una función: se puede ejecutar antes de fusionar la PR.

create function public.es_miembro(p_quedada_id text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.quedada_miembros m
    where m.quedada_id = p_quedada_id and m.usuario_id = (select auth.uid())
  )
$$;

revoke execute on function public.es_miembro(text) from public, anon;
grant execute on function public.es_miembro(text) to authenticated;

drop policy "ver las propias y compartidas" on public.quedadas;
drop policy "editar las propias y compartidas" on public.quedadas;

create policy "ver las propias y compartidas" on public.quedadas
  for select to authenticated
  using (propietario_id = (select auth.uid()) or public.es_miembro(id));

create policy "editar las propias y compartidas" on public.quedadas
  for update to authenticated
  using (propietario_id = (select auth.uid()) or public.es_miembro(id))
  with check (propietario_id = (select auth.uid()) or public.es_miembro(id));
