-- Drop existing tables
drop table if exists leads cascade;
drop table if exists personas cascade;
drop table if exists api_keys cascade;

-- Accounts (one per Highlevel sub-account/client)
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User roles (agency_admin or sub_account)
create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'sub_account',
  account_id uuid references accounts(id) on delete cascade -- null for agency_admin
);

-- API keys per account
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  service text not null, -- 'highlevel', 'apollo', 'gemini'
  key_value text not null,
  extra_data jsonb,
  updated_at timestamptz default now(),
  unique(account_id, service)
);

-- Personas per account
create table personas (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  description text not null,
  characteristics text not null,
  sample_person text,
  highlevel_workflow_id text,
  highlevel_workflow_name text,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads per account
create table leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  highlevel_contact_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text,
  raw_data jsonb not null default '{}',
  enriched_data jsonb,
  assigned_persona_id uuid references personas(id),
  persona_reasoning text,
  status text not null default 'pending',
  workflow_triggered boolean default false,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index leads_account_idx on leads(account_id);
create index leads_status_idx on leads(status);
create index leads_persona_idx on leads(assigned_persona_id);
create index leads_created_idx on leads(created_at desc);
