-- AUTO-GENERATED schema dump from old Supabase project
-- Tables: agent_chat, bills, calendar_events, calendar_reminders, contacts, expenses, meals, messages, notes, pantry, push_subscriptions, shopping_items, shopping_lists, tasks, weekly_plan, wish_list

-- Table: agent_chat
create table if not exists "agent_chat" (
  "id" uuid default gen_random_uuid() not null,
  "role" text not null,
  "content" text not null,
  "created_at" timestamp with time zone default now(),
  primary key ("id"),
  constraint "agent_chat_role_check" check ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

-- Table: bills
create table if not exists "bills" (
  "id" bigint generated ALWAYS as identity not null,
  "name" text not null,
  "amount" numeric not null,
  "due_day" integer not null,
  "category" text,
  "active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "notes" text,
  "last_paid_month" text,
  primary key ("id"),
  constraint "bills_due_day_check" check (((due_day >= 1) AND (due_day <= 31)))
);

-- Table: calendar_events
create table if not exists "calendar_events" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "date" date not null,
  "time" text,
  "owner" text not null,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "is_done" boolean default false,
  "done_at" timestamp with time zone,
  primary key ("id"),
  constraint "calendar_events_owner_check" check ((owner = ANY (ARRAY['adrian'::text, 'kasia'::text, 'oboje'::text])))
);

-- Table: calendar_reminders
create table if not exists "calendar_reminders" (
  "id" uuid default gen_random_uuid() not null,
  "event_id" uuid not null,
  "offset_minutes" integer not null,
  "created_at" timestamp with time zone default now(),
  "sent_at" timestamp with time zone,
  primary key ("id")
);

-- Table: contacts
create table if not exists "contacts" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "role" text,
  "phone" text,
  "email" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  primary key ("id")
);

-- Table: expenses
create table if not exists "expenses" (
  "id" bigint generated ALWAYS as identity not null,
  "date" text not null,
  "category" text not null,
  "amount" numeric not null,
  "description" text default ''::text,
  "created_at" timestamp with time zone default now(),
  "type" text default 'wydatek'::text not null,
  "notes" text,
  primary key ("id")
);

-- Table: meals
create table if not exists "meals" (
  "id" bigint generated ALWAYS as identity not null,
  "name" text not null,
  "protein_rating" text,
  "prep_time" integer,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "version" integer default 1,
  "category" text,
  "protein_per_serving" integer,
  "recipe" text,
  "ingredients" text,
  primary key ("id"),
  constraint "meals_protein_rating_check" check ((protein_rating = ANY (ARRAY['hi'::text, 'md'::text, 'ok'::text, 'lo'::text])))
);

-- Table: messages
create table if not exists "messages" (
  "id" uuid default gen_random_uuid() not null,
  "owner" text not null,
  "text" text not null,
  "created_at" timestamp with time zone default now(),
  primary key ("id")
);

-- Table: notes
create table if not exists "notes" (
  "id" uuid default gen_random_uuid() not null,
  "owner" text default 'oboje'::text not null,
  "title" text not null,
  "body" text,
  "color" text default 'yellow'::text,
  "pinned" boolean default false,
  "created_at" timestamp with time zone default now(),
  "priority" boolean default false not null,
  primary key ("id")
);

-- Table: pantry
create table if not exists "pantry" (
  "id" bigint generated ALWAYS as identity not null,
  "name" text not null,
  "category" text,
  "quantity" numeric default 1,
  "unit" text default 'szt'::text,
  "purchase_date" date,
  "expiry_days" integer,
  "created_at" timestamp with time zone default now(),
  "protein_per_100g" numeric,
  "fat_per_100g" numeric,
  "carbs_per_100g" numeric,
  "kcal_per_100g" numeric,
  "is_consumed" boolean default false,
  "consumed_at" timestamp with time zone,
  primary key ("id")
);

-- Table: push_subscriptions
create table if not exists "push_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "owner" text not null,
  "endpoint" text not null,
  "p256dh" text not null,
  "auth" text not null,
  "created_at" timestamp with time zone default now(),
  primary key ("id"),
  constraint "push_subscriptions_owner_check" check ((owner = ANY (ARRAY['adrian'::text, 'kasia'::text])))
);

-- Table: shopping_items
create table if not exists "shopping_items" (
  "id" bigint generated ALWAYS as identity not null,
  "list_id" bigint,
  "name" text not null,
  "quantity" text default ''::text,
  "unit" text default ''::text,
  "checked" boolean default false,
  "category" text default 'inne'::text,
  "source" text default 'generated'::text,
  primary key ("id")
);

-- Table: shopping_lists
create table if not exists "shopping_lists" (
  "id" bigint generated ALWAYS as identity not null,
  "week_number" integer not null,
  "created_at" text not null,
  "status" text default 'active'::text,
  primary key ("id")
);

-- Table: tasks
create table if not exists "tasks" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "assigned_to" text not null,
  "due_date" date,
  "status" text default 'todo'::text not null,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "done_at" timestamp with time zone,
  primary key ("id"),
  constraint "tasks_assigned_to_check" check ((assigned_to = ANY (ARRAY['adrian'::text, 'kasia'::text, 'oboje'::text]))),
  constraint "tasks_status_check" check ((status = ANY (ARRAY['todo'::text, 'done'::text])))
);

-- Table: weekly_plan
create table if not exists "weekly_plan" (
  "id" bigint generated ALWAYS as identity not null,
  "week_number" integer not null,
  "day_of_week" integer not null,
  "meal_id" bigint,
  "meal_name" text,
  "created_at" timestamp with time zone default now(),
  primary key ("id"),
  constraint "weekly_plan_day_of_week_check" check (((day_of_week >= 1) AND (day_of_week <= 7)))
);

-- Table: wish_list
create table if not exists "wish_list" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "category" text default 'dom'::text,
  "price_estimate" numeric,
  "priority" text default 'normal'::text,
  "notes" text,
  "owner" text default 'oboje'::text,
  "bought" boolean default false,
  "created_at" timestamp with time zone default now(),
  primary key ("id")
);


-- Indexes
create index if not exists agent_chat_created_at_idx ON public.agent_chat USING btree (created_at);
create unique index if not exists push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);
