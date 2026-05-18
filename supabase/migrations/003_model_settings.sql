-- Migration 003: Multi-provider AI model support
-- Adds 'ai_model' as a new service type in api_keys.
-- No schema changes needed — the table already supports arbitrary service names.
--
-- ai_model entries use:
--   service     = 'ai_model'
--   key_value   = the API key for the chosen provider
--   extra_data  = { "provider": "gemini"|"openai"|"anthropic"|"openrouter",
--                   "model":    "<model-id>" }
--
-- Existing 'gemini' entries are kept for backward compatibility and will be
-- used as a fallback when no 'ai_model' entry is present.

-- No DDL required — this migration is intentionally a no-op at the schema level.
-- The comment documents the convention for the application layer.
SELECT 1;
