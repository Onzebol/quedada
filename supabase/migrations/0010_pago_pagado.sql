-- #120: si quien debía un pago de la casa ya lo ha pagado. Sustituye a `participantes.casa_enviada` de `0009`,
-- que no llegó a usarse en la interfaz.
-- Solo añade una columna con valor por defecto: la versión anterior de la app sigue funcionando.

alter table public.pagos
  add column pagado boolean not null default false;

alter table public.participantes
  drop column if exists casa_enviada;
