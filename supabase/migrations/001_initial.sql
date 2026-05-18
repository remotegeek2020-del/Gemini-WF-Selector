create table api_keys (
  id uuid primary key default gen_random_uuid(),
  service text not null unique, -- 'highlevel', 'apollo', 'gemini'
  key_value text not null,
  extra_data jsonb, -- for highlevel: location_id, etc.
  updated_at timestamptz default now()
);

create table personas (
  id uuid primary key default gen_random_uuid(),
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

create table leads (
  id uuid primary key default gen_random_uuid(),
  highlevel_contact_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  source text, -- facebook, linkedin, google, other
  raw_data jsonb not null default '{}',
  enriched_data jsonb,
  assigned_persona_id uuid references personas(id),
  persona_reasoning text,
  status text not null default 'pending', -- pending, enriching, assigned, failed, no_persona
  workflow_triggered boolean default false,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index leads_status_idx on leads(status);
create index leads_persona_idx on leads(assigned_persona_id);
create index leads_created_idx on leads(created_at desc);
