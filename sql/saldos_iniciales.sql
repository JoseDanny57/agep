-- Capital Inicial: tabla de saldos iniciales del negocio (caja, inversión, activos fijos)
-- Ejecutar en el SQL Editor de Supabase antes de usar la pantalla "Capital Inicial".

create table if not exists saldos_iniciales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('caja', 'inversion', 'activo_fijo')),
  descripcion text,
  monto numeric(12,2) not null,
  fecha date not null default current_date,
  creado_en timestamp not null default now()
);

alter table saldos_iniciales enable row level security;

create policy "saldos_iniciales_select" on saldos_iniciales
  for select using (auth.uid() = user_id);

create policy "saldos_iniciales_insert" on saldos_iniciales
  for insert with check (auth.uid() = user_id);

create policy "saldos_iniciales_update" on saldos_iniciales
  for update using (auth.uid() = user_id);

create policy "saldos_iniciales_delete" on saldos_iniciales
  for delete using (auth.uid() = user_id);
