-- Add videos column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;

-- Add location_name column if it doesn't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_name TEXT;
