-- #118: foto del tique de un gasto. La imagen vive en Supabase Storage (bucket privado `tiques`,
-- rutas `<quedada_id>/<gasto_id>.jpg`) y el gasto guarda solo la ruta.
-- Solo añade una columna nula y un bucket nuevo: la versión anterior de la app sigue funcionando.

alter table public.gastos add column imagen text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tiques', 'tiques', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Quién toca las imágenes: quien pueda acceder a la quedada de la primera carpeta de la ruta
-- (así el paso 3 de #29, que redefine `puede_acceder`, las amplía solo).
create policy "ver tiques" on storage.objects for select to authenticated
  using (bucket_id = 'tiques' and public.puede_acceder((storage.foldername(name))[1]));
create policy "subir tiques" on storage.objects for insert to authenticated
  with check (bucket_id = 'tiques' and public.puede_acceder((storage.foldername(name))[1]));
create policy "cambiar tiques" on storage.objects for update to authenticated
  using (bucket_id = 'tiques' and public.puede_acceder((storage.foldername(name))[1]))
  with check (bucket_id = 'tiques' and public.puede_acceder((storage.foldername(name))[1]));
create policy "borrar tiques" on storage.objects for delete to authenticated
  using (bucket_id = 'tiques' and public.puede_acceder((storage.foldername(name))[1]));
