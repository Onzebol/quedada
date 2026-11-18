-- #95: gastos reales (lo que cada uno ha puesto de su bolsillo). Son lo único que cuenta en las
-- cuentas (junto con los pagos de la casa de `0005`); los precios de la lista de la compra son solo orientativos.
-- Solo crea una tabla nueva: la versión anterior de la app sigue funcionando.

create table public.gastos (
  quedada_id text not null references public.quedadas (id) on delete cascade,
  id text not null,
  posicion integer not null,
  -- Participante o familia que ha pagado (id de `participantes` o `asistentes`, sin clave ajena como en el resto).
  pagador_id text not null,
  concepto text not null,
  -- Importe en céntimos.
  importe integer not null check (importe > 0),
  primary key (quedada_id, id)
);

alter table public.gastos enable row level security;
create index gastos_quedada_idx on public.gastos (quedada_id);
create policy "ver" on public.gastos for select to authenticated using (public.puede_acceder(quedada_id));
create policy "crear" on public.gastos for insert to authenticated with check (public.puede_acceder(quedada_id));
create policy "editar" on public.gastos for update to authenticated
  using (public.puede_acceder(quedada_id)) with check (public.puede_acceder(quedada_id));
create policy "borrar" on public.gastos for delete to authenticated using (public.puede_acceder(quedada_id));

-- Avisos en tiempo real, como en `0003`.
create trigger gastos_avisar after insert or update or delete on public.gastos
  for each row execute function public.avisar_cambio_quedada();
