-- Migration: Add location_name column to locations table
-- Run this in your Supabase SQL Editor

-- Add location_name column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add comment
COMMENT ON COLUMN locations.location_name IS 'Human-readable location name (city, area, etc.) from reverse geocoding';
