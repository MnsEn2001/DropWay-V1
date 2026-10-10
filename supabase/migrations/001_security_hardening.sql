-- Migration: 001_security_hardening.sql
-- Purpose: begin security hardening and add a minimal audit trail pattern

-- NOTE:
-- This file is intentionally conservative. It does not assume a final schema.
-- It is a starting point to be reviewed and applied in the actual Supabase project.

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security for the audit table.
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Users should only see their own audit events.
CREATE POLICY IF NOT EXISTS "Users can view their own audit records"
ON audits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own audit records"
ON audits
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Recommended intended policy direction for user-owned tables:
-- 1. houses: add a user_id column if the design requires per-user isolation.
-- 2. pending_houses: require auth.uid() = user_id for all access.
-- 3. today_houses: require auth.uid() = user_id for all access.
-- 4. start_positions: require auth.uid() = user_id for all access.
--
-- Important:
-- This migration intentionally does not assume the existing tables already have
-- a user_id column. It is a guardrail and implementation template.
