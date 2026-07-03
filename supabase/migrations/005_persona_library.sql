-- Migration 005: Persona Library
--
-- Agency-level template personas that sub-accounts can browse and import
-- into any of their pipelines (main, facebook, google, etc.).
-- No HighLevel-specific fields; those are set after import in the account's persona.

CREATE TABLE IF NOT EXISTS persona_library (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null default 'general', -- 'general' | 'linkedin' | 'facebook' | 'google'
  color            text not null default '#6366f1',
  description      text,
  -- Sample person snapshot
  full_name        text,
  title_role       text,
  age              text,
  location         text,
  current_income   text,
  income_goal      text,
  background_story text,
  core_frustration text,
  -- Characteristics
  who_they_are       text,
  industry_experience text,
  primary_frustration text,
  what_they_want     text,
  decision_trigger   text,
  trust_barrier      text,
  engagement_style   text,
  best_contact_method text,
  sells_into         text,
  characteristics    text,
  state              text,
  county             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

ALTER TABLE persona_library ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read library entries
CREATE POLICY persona_library_select ON persona_library
  FOR SELECT USING (true);

-- Only agency admins can create/update/delete
CREATE POLICY persona_library_insert ON persona_library
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin')
  );

CREATE POLICY persona_library_update ON persona_library
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'));

CREATE POLICY persona_library_delete ON persona_library
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'agency_admin')
  );
