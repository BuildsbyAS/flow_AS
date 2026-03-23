import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzIyOTIsImV4cCI6MjA4OTQ0ODI5Mn0.ipTTL5d2A1S3MF08JTtwlms5sZF1M2pr_-DGERlTmTE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
