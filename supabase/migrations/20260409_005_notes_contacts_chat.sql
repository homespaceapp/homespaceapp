-- Notatki domowe
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  owner text not null default 'oboje',
  title text not null,
  body text,
  color text default 'yellow',
  pinned boolean default false,
  created_at timestamptz default now()
);

-- Kontakty domowe
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

-- Czat para
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  owner text not null,
  text text not null,
  created_at timestamptz default now()
);
