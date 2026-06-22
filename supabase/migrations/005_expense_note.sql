-- Add optional note to expenses
-- Run in Supabase SQL Editor after previous migrations

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS note TEXT;
