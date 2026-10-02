create table if not exists public.herramientas (
  id uuid primary key,
  nombre text not null,
  lenguaje text not null,
  categorias jsonb not null default '[]'::jsonb,
  codigo text not null default '',
  proposito text not null default '',
  problema text not null default '',
  requisitos text not null default '',
  salida text not null default '',
  advertencias text not null default '',
  analisis jsonb not null default '{}'::jsonb,
  depende_de jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now(),
  creado_por uuid references auth.users(id) on delete set null
);

alter table public.herramientas enable row level security;

drop policy if exists "Todos pueden consultar herramientas" on public.herramientas;
create policy "Todos pueden consultar herramientas"
  on public.herramientas for select
  to anon, authenticated
  using (true);

drop policy if exists "Usuarios autenticados pueden crear herramientas" on public.herramientas;
create policy "Usuarios autenticados pueden crear herramientas"
  on public.herramientas for insert
  to authenticated
  with check (
    auth.uid() = creado_por
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'banquezbetancourt15@gmail.com'
  );

drop policy if exists "Usuarios autenticados pueden actualizar herramientas" on public.herramientas;
create policy "Usuarios autenticados pueden actualizar herramientas"
  on public.herramientas for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'banquezbetancourt15@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'banquezbetancourt15@gmail.com');

drop policy if exists "Usuarios autenticados pueden eliminar herramientas" on public.herramientas;
create policy "Usuarios autenticados pueden eliminar herramientas"
  on public.herramientas for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'banquezbetancourt15@gmail.com');

create index if not exists herramientas_creado_en_idx
  on public.herramientas (creado_en desc);
