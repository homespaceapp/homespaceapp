-- Oznaczanie wydarzeń jako zrobionych
alter table calendar_events add column if not exists is_done boolean default false;
alter table calendar_events add column if not exists done_at timestamptz default null;
