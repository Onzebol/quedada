-- Paso 2 de #29: tiempo real. Cada cambio en una quedada o en sus tablas hijas se avisa por
-- Broadcast desde la base de datos al canal privado `quedada:<id>`. Se usa Broadcast y no Postgres
-- Changes porque los DELETE de este último no se filtran ni pasan por RLS.
-- Los clientes solo usan el aviso como «ha cambiado algo» y vuelven a leer la quedada.

create function public.avisar_cambio_quedada() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_quedada text;
begin
  v_quedada := case tg_table_name
    when 'quedadas' then coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id')
    else coalesce(to_jsonb(new) ->> 'quedada_id', to_jsonb(old) ->> 'quedada_id')
  end;
  perform realtime.broadcast_changes(
    'quedada:' || v_quedada, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end $$;

revoke execute on function public.avisar_cambio_quedada() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['quedadas', 'participantes', 'grupos', 'productos', 'asistentes', 'basicos'] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.avisar_cambio_quedada()',
      t || '_avisar', t);
  end loop;
end $$;

-- Quién puede recibir los avisos de `quedada:<id>`: quien pueda acceder a esa quedada (hoy su
-- propietario; el paso 3 de #29 redefine `puede_acceder` y esto se amplía solo).
create policy "recibir los avisos de mis quedadas" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'quedada:%'
    and public.puede_acceder(substring((select realtime.topic()) from 9))
  );
