import { createClient } from '@supabase/supabase-js';

// Supabase credentials provided by the user
const supabaseUrl = 'https://javdmqotufbxdgpsnjlj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdmRtcW90dWZieGRncHNuamxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTI1MDIsImV4cCI6MjA3OTU4ODUwMn0.k8o-7-naG-kxxjjDTZztnuqQI5hIfJ-P4yicT9Appqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
