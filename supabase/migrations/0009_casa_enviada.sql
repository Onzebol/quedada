-- #120: si un participante ya ha enviado a quien pagó la casa lo que le toca de ella.
-- Solo añade una columna nula: la versión anterior de la app sigue funcionando.

alter table public.participantes
  add column casa_enviada boolean;
