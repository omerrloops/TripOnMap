-- Migration: Add category column to existing locations table
-- Run this in your Supabase SQL Editor if you already have the locations table

-- Add category column if it doesn't exist
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';

-- Optional: Update existing rows to have a default category based on their color
-- This is just a suggestion, you can skip this if you want to manually categorize existing entries
UPDATE locations 
SET category = 'attractions' 
WHERE category IS NULL OR category = 'other';
