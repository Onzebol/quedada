-- Paso 4 de #29 (#136): invitar por enlace. El propietario genera un enlace con un token; quien lo
-- abre con su cuenta de Google pasa a ser miembro de la quedada. Solo añade una tabla y una columna
-- y crea funciones: se puede ejecutar antes de fusionar la PR sin romper la versión anterior.
--
-- Todo va por funciones `security definer` (que comprueban quién llama): la tabla de invitaciones
-- tiene la RLS activada y ninguna política, así que desde la API no se puede leer ni escribir.

alter table public.quedada_miembros add column nombre text not null default '';

create table public.invitaciones (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  quedada_id text not null references public.quedadas (id) on delete cascade,
  creada timestamptz not null default now(),
  caduca timestamptz not null default now() + interval '30 days',
  activa boolean not null default true
);

create index invitaciones_quedada_idx on public.invitaciones (quedada_id);

alter table public.invitaciones enable row level security;

-- Crea un enlace nuevo y desactiva el anterior. Solo el propietario.
create function public.crear_invitacion(p_quedada_id text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  nuevo text;
begin
  if not public.es_propietario(p_quedada_id) then
    raise exception 'Solo el propietario puede invitar';
  end if;
  update public.invitaciones set activa = false where quedada_id = p_quedada_id and activa;
  insert into public.invitaciones (quedada_id) values (p_quedada_id) returning token into nuevo;
  return nuevo;
end $$;

-- El enlace vigente de la quedada, o null. Solo el propietario.
create function public.invitacion_activa(p_quedada_id text) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  vigente text;
begin
  if not public.es_propietario(p_quedada_id) then
    raise exception 'Solo el propietario puede ver el enlace';
  end if;
  select i.token into vigente from public.invitaciones i
    where i.quedada_id = p_quedada_id and i.activa and i.caduca > now()
    order by i.creada desc limit 1;
  return vigente;
end $$;

create function public.desactivar_invitacion(p_quedada_id text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_propietario(p_quedada_id) then
    raise exception 'Solo el propietario puede desactivar el enlace';
  end if;
  update public.invitaciones set activa = false where quedada_id = p_quedada_id and activa;
end $$;

-- Nombre de la quedada a la que lleva el enlace, o null si no vale (para el «Te han invitado a…»).
create function public.nombre_invitacion(p_token text) returns text
language sql stable security definer set search_path = ''
as $$
  select q.nombre from public.invitaciones i
  join public.quedadas q on q.id = i.quedada_id
  where i.token = p_token and i.activa and i.caduca > now()
$$;

-- Hace miembro a quien llama y devuelve el id de la quedada. Repetirlo no duplica; el propietario
-- no se hace miembro de lo suyo.
create function public.aceptar_invitacion(p_token text, p_nombre text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  destino text;
  yo uuid := (select auth.uid());
begin
  if yo is null then
    raise exception 'Hay que entrar con una cuenta';
  end if;
  select i.quedada_id into destino from public.invitaciones i
    where i.token = p_token and i.activa and i.caduca > now();
  if destino is null then
    raise exception 'La invitación no es válida o ha caducado';
  end if;
  if not public.es_propietario(destino) then
    insert into public.quedada_miembros (quedada_id, usuario_id, nombre)
      values (destino, yo, coalesce(trim(p_nombre), ''))
      on conflict (quedada_id, usuario_id) do nothing;
  end if;
  return destino;
end $$;

-- Quiénes son los miembros (sin el propietario). Lo ven el propietario y los miembros.
create function public.miembros_de(p_quedada_id text) returns table (usuario_id uuid, nombre text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.puede_acceder(p_quedada_id) then
    raise exception 'No tienes acceso a esta quedada';
  end if;
  return query
    select m.usuario_id, m.nombre from public.quedada_miembros m
    where m.quedada_id = p_quedada_id order by m.creado;
end $$;

create function public.retirar_miembro(p_quedada_id text, p_usuario_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_propietario(p_quedada_id) then
    raise exception 'Solo el propietario puede retirar miembros';
  end if;
  delete from public.quedada_miembros where quedada_id = p_quedada_id and usuario_id = p_usuario_id;
end $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'crear_invitacion(text)', 'invitacion_activa(text)', 'desactivar_invitacion(text)',
    'nombre_invitacion(text)', 'aceptar_invitacion(text, text)', 'miembros_de(text)',
    'retirar_miembro(text, uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
