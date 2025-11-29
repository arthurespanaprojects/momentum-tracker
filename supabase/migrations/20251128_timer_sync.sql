-- Tabla para sincronizar el estado del cronómetro entre dispositivos
create table if not exists timer_sync (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  activity_name text not null,
  for_date date not null,
  is_active boolean not null default true,
  start_time bigint not null, -- timestamp en milisegundos
  paused_time integer not null default 0, -- segundos acumulados pausados
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Solo puede haber un cronómetro activo a la vez
create unique index timer_sync_active_idx on timer_sync (id) where is_active = true;

-- RLS policies
alter table timer_sync enable row level security;

create policy "Users can view timer sync"
  on timer_sync for select
  using (true);

create policy "Users can insert timer sync"
  on timer_sync for insert
  with check (true);

create policy "Users can update timer sync"
  on timer_sync for update
  using (true);

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

create trigger update_timer_sync_updated_at
  before update on timer_sync
  for each row
  execute function update_timer_sync_updated_at();
