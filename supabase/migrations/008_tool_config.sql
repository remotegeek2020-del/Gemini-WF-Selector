-- Add per-account enrichment tool configuration
alter table accounts add column if not exists tool_config jsonb;

-- Index for fast lookup during enrichment
create index if not exists accounts_tool_config_idx on accounts using gin (tool_config);
