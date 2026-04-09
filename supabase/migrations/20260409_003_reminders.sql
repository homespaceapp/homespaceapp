-- Usuń stare pole reminder_days z calendar_events
alter table calendar_events drop column if exists reminder_days;

-- Nowa tabela: wiele przypomnień per wydarzenie
create table if not exists calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references calendar_events(id) on delete cascade,
  offset_minutes int not null,
  created_at timestamptz default now()
);
