-- Migration 004: Multi-channel pipeline support
--
-- Removes the hard-coded pipeline CHECK constraint on personas and leads
-- so that any pipeline slug (facebook, google, tiktok, etc.) can be used
-- without a schema change. The allowed values are now enforced by the
-- pipelines table (application layer) rather than a DB constraint.

-- Drop the pipeline check on personas
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_pipeline_check;

-- Drop the pipeline check on leads
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_pipeline_check;
