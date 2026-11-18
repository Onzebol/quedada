-- #91: pagos de la casa por familia (reserva, resto…). Sustituye al pagador único `casa_pagador_id`.
-- Solo añade una tabla: la versión anterior de la app sigue funcionando. `casa_pagador_id` NO se
-- borra (la app nueva ya no lo lee ni lo escribe). Se puede volver a ejecutar sin duplicar nada.

create table public.pagos (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  -- Familia (id de `asistentes`, sin clave ajena como en el resto).
  familia_id text not null,
  -- Céntimos.
  importe integer not null check (importe > 0),
  concepto text not null default '',
  primary key (quedada_id, id)
);

alter table public.pagos enable row level security;
create index pagos_quedada_idx on public.pagos (quedada_id);
create policy "ver" on public.pagos for select to authenticated using (public.puede_acceder(quedada_id));
create policy "crear" on public.pagos for insert to authenticated with check (public.puede_acceder(quedada_id));
create policy "editar" on public.pagos for update to authenticated
  using (public.puede_acceder(quedada_id)) with check (public.puede_acceder(quedada_id));
create policy "borrar" on public.pagos for delete to authenticated using (public.puede_acceder(quedada_id));

create trigger pagos_avisar after insert or update or delete on public.pagos
  for each row execute function public.avisar_cambio_quedada();

-- Quien figuraba como pagador del alquiler pasa a ser un pago de su familia por el precio completo.
-- Si la persona no tiene familia no se puede convertir y se ignora. Id fijo: no duplica al repetirse.
insert into public.pagos (quedada_id, id, posicion, familia_id, importe, concepto)
select q.id, 'migrado-pagador', 0, p.familia_id, q.casa_precio, 'Alquiler'
from public.quedadas q
join public.participantes p on p.quedada_id = q.id and p.id = q.casa_pagador_id
where q.casa_precio > 0 and p.familia_id is not null
on conflict (quedada_id, id) do nothing;
