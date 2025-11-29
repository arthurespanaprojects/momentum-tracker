-- EJECUTA ESTE SQL EN TU DASHBOARD DE SUPABASE (SQL Editor)
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Tabla para sincronizar el estado del cronómetro entre dispositivos
create table if not exists timer_sync (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  activity_name text not null,
  for_date date not null,
  is_active boolean not null default true,
  start_time bigint not null,
  paused_time integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Solo puede haber un cronómetro activo a la vez por actividad/fecha
create unique index if not exists timer_sync_activity_date_idx on timer_sync (activity_id, for_date);

-- RLS policies
alter table timer_sync enable row level security;

drop policy if exists "Users can view timer sync" on timer_sync;
create policy "Users can view timer sync"
  on timer_sync for select
  using (true);

drop policy if exists "Users can insert timer sync" on timer_sync;
create policy "Users can insert timer sync"
  on timer_sync for insert
  with check (true);

drop policy if exists "Users can update timer sync" on timer_sync;
create policy "Users can update timer sync"
  on timer_sync for update
  using (true);

drop policy if exists "Users can delete timer sync" on timer_sync;
create policy "Users can delete timer sync"
  on timer_sync for delete
  using (true);

-- Función para actualizar updated_at automáticamente
create or replace function update_timer_sync_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_timer_sync_updated_at on timer_sync;
create trigger update_timer_sync_updated_at
  before update on timer_sync
  for each row
  execute function update_timer_sync_updated_at();
