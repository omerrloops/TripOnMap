# Supabase Setup Instructions

## 1. Create the Database Table

1. Go to your Supabase project dashboard: https://javdmqotufbxdgpsnjlj.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-setup.sql` into the editor
5. Click **Run** to execute the SQL

This will create:
- A `locations` table with columns for lat, lng, description, date, color, and photos
- Row Level Security policies (currently allows all operations)
- An index on the date column for performance

## 2. Create the Storage Bucket

1. In your Supabase dashboard, navigate to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it: `trip_photos`
4. Set it to **Public** (so photos can be viewed without authentication)
5. Click **Create bucket**

## 3. Configure Storage Policies

After creating the bucket, you need to set up policies:

1. Click on the `trip_photos` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Choose **For full customization** 
5. Create a policy with these settings:
   - Policy name: `Allow public uploads`
   - Allowed operations: `INSERT`, `SELECT`
   - Target roles: `public`
   - Policy definition: `true`
6. Click **Review** then **Save policy**

## 4. Test the Application

Once the database and storage are set up:
1. The app should now be able to save locations and upload photos
2. Refresh the page to see any existing locations loaded from the database
3. Click on the map to add a new location with photos

## Troubleshooting

If you encounter errors:
- Check the browser console for error messages
- Verify the storage bucket is public
- Ensure RLS policies are correctly set up
- Check that the table structure matches the SQL schema
