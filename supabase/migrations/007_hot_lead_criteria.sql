-- Per-account hot lead criteria config
alter table accounts add column if not exists hot_lead_criteria jsonb;

-- Structured criteria matches stored per lead so the UI can show why it was flagged
alter table leads add column if not exists hot_criteria_matched jsonb;
