-- #119: adulto o niño. `null` = adulto (por defecto); `false` = niño, que no puede comprar ni pagar gastos.
-- Solo añade una columna nula: la versión anterior de la app sigue funcionando.

alter table public.participantes
  add column adulto boolean;
