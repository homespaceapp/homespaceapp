-- ============================================================
-- MULTI-TENANT SAAS — Households + household_id
-- Etap 1/2: struktura + backfill. RLS włączony w osobnej migracji.
-- ============================================================

-- 1. HOUSEHOLDS ----------------------------------------------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- 2. HOUSEHOLD_MEMBERS ---------------------------------------
create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);

create index if not exists idx_household_members_user on household_members(user_id);

-- 3. DEFAULT HOUSEHOLD dla obecnych danych Adriana i Kasi ----
-- Stały UUID dla "Dom Loszki" — backfill wszystkich istniejących wierszy
insert into households (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Dom Loszki')
on conflict (id) do nothing;

-- 4. DODAJ household_id DO WSZYSTKICH TABEL --------------------
-- Każda tabela: kolumna nullable, backfill do default household, potem NOT NULL

do $$
declare
  t text;
  tbls text[] := array[
    'pantry', 'weekly_plan', 'expenses', 'bills',
    'shopping_lists', 'shopping_items',
    'calendar_events', 'calendar_reminders',
    'notes', 'contacts', 'messages', 'tasks', 'meals'
  ];
begin
  foreach t in array tbls loop
    if exists (select 1 from information_schema.tables where table_name = t) then
      execute format('alter table %I add column if not exists household_id uuid references households(id) on delete cascade', t);
      execute format('update %I set household_id = ''00000000-0000-0000-0000-000000000001'' where household_id is null', t);
    end if;
  end loop;
end $$;

-- Indeksy na household_id (dla wydajności RLS)
create index if not exists idx_pantry_household on pantry(household_id);
create index if not exists idx_weekly_plan_household on weekly_plan(household_id);
create index if not exists idx_expenses_household on expenses(household_id);
create index if not exists idx_bills_household on bills(household_id);
create index if not exists idx_shopping_lists_household on shopping_lists(household_id);
create index if not exists idx_shopping_items_household on shopping_items(household_id);
create index if not exists idx_calendar_events_household on calendar_events(household_id);
create index if not exists idx_notes_household on notes(household_id);
create index if not exists idx_contacts_household on contacts(household_id);
create index if not exists idx_messages_household on messages(household_id);
create index if not exists idx_tasks_household on tasks(household_id);

-- 5. PUSH SUBSCRIPTIONS — user_id + household_id + usunięcie check owner ----
alter table push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table push_subscriptions add column if not exists household_id uuid references households(id) on delete cascade;
update push_subscriptions set household_id = '00000000-0000-0000-0000-000000000001' where household_id is null;

-- Usuń constraint blokujący nowych userów (owner musiał być 'adrian' lub 'kasia')
do $$
begin
  if exists (select 1 from information_schema.check_constraints
             where constraint_name like 'push_subscriptions_owner_check%') then
    execute 'alter table push_subscriptions drop constraint ' ||
      (select constraint_name from information_schema.check_constraints
       where constraint_name like 'push_subscriptions_owner_check%' limit 1);
  end if;
end $$;

-- 6. INVITE TOKENS --------------------------------------------
create table if not exists invite_tokens (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  used_at timestamptz default null,
  used_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create index if not exists idx_invite_tokens_token on invite_tokens(token);

-- 7. HELPER FUNCTION — aktualny household usera ----------------
create or replace function public.user_households()
returns setof uuid
language sql
stable
security definer
as $$
  select household_id from household_members where user_id = auth.uid();
$$;
