-- Migration 006: Per-pipeline notification emails
--
-- Moves notification emails from the account level (accounts.notification_emails)
-- to the pipeline level so each channel (main, facebook-ads, google-ads, etc.)
-- can have its own recipient list, independent of other pipelines.

ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS notification_emails text[] NOT NULL DEFAULT '{}';
