-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  color VARCHAR(7) DEFAULT '#ff0000',
  category VARCHAR(50) DEFAULT 'other',
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on locations" ON locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_date ON locations(date);
