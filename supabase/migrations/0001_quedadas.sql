-- Quedadas por usuario. Cada fila es una quedada completa (documento jsonb) de su propietario.
-- La seguridad por fila (RLS) garantiza que cada cuenta solo lee y escribe las suyas.

create table public.quedadas (
  id text primary key,
  propietario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null,
  creada timestamptz not null default now(),
  actualizada timestamptz not null default now()
);

create index quedadas_propietario_idx on public.quedadas (propietario_id);

create function public.tocar_actualizada() returns trigger
language plpgsql as $$
begin
  new.actualizada = now();
  return new;
end $$;

create trigger quedadas_actualizada before update on public.quedadas
  for each row execute function public.tocar_actualizada();

alter table public.quedadas enable row level security;

create policy "ver las propias" on public.quedadas
  for select to authenticated using (propietario_id = (select auth.uid()));

create policy "crear las propias" on public.quedadas
  for insert to authenticated with check (propietario_id = (select auth.uid()));

create policy "editar las propias" on public.quedadas
  for update to authenticated
  using (propietario_id = (select auth.uid()))
  with check (propietario_id = (select auth.uid()));

create policy "borrar las propias" on public.quedadas
  for delete to authenticated using (propietario_id = (select auth.uid()));
