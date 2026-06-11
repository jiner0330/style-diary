-- Migration: Add fit/length/neckline columns to existing clothing_items table
-- Run this in Supabase SQL Editor if the columns don't already exist

ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS fit TEXT;
ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS length TEXT;
ALTER TABLE clothing_items ADD COLUMN IF NOT EXISTS neckline TEXT;
