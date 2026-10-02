-- Ejecutar en Supabase para restringir escritura al administrador autorizado.

drop policy if exists "Usuarios autenticados pueden crear herramientas"
  on public.herramientas;
drop policy if exists "Usuarios autenticados pueden actualizar herramientas"
  on public.herramientas;
drop policy if exists "Usuarios autenticados pueden eliminar herramientas"
  on public.herramientas;

create policy "Solo el administrador puede crear herramientas"
  on public.herramientas for insert
  to authenticated
  with check (
    auth.uid() = creado_por
    and lower(coalesce(auth.jwt() ->> 'email', '')) =
      'banquezbetancourt15@gmail.com'
  );

create policy "Solo el administrador puede actualizar herramientas"
  on public.herramientas for update
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) =
      'banquezbetancourt15@gmail.com'
  )
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) =
      'banquezbetancourt15@gmail.com'
  );

create policy "Solo el administrador puede eliminar herramientas"
  on public.herramientas for delete
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) =
      'banquezbetancourt15@gmail.com'
  );
