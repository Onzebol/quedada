-- #130: persona de cada familia a la que se le acreditan los pagos de la casa (id de `participantes`,
-- sin clave ajena como en el resto). Nula = el primer adulto de la familia.
-- Solo añade una columna nula: la versión anterior de la app sigue funcionando.

alter table public.asistentes
  add column pagador_id text;
