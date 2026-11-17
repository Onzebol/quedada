-- #56: ficha de la casa (en `quedadas`) y familias / porcentaje de casa de cada participante.
-- Solo añade columnas con valor por defecto o nulas: la versión anterior de la app sigue funcionando.

alter table public.quedadas
  add column casa_titulo text not null default '',
  add column casa_descripcion text not null default '',
  add column casa_direccion text not null default '',
  add column casa_latitud double precision,
  add column casa_longitud double precision,
  -- Precio del alquiler en céntimos.
  add column casa_precio integer check (casa_precio is null or casa_precio >= 0),
  -- Participante que ha pagado el alquiler (id de `participantes`, sin clave ajena como en el resto).
  add column casa_pagador_id text;

alter table public.participantes
  add column porcentaje_casa double precision,
  -- Familia (id de `asistentes`) de la que es componente.
  add column familia_id text;
