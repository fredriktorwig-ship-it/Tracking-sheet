// ══════════════════════════════════════════
// Supabase client — fill in your credentials
// ══════════════════════════════════════════
const SUPABASE_URL  = 'https://ynxxhqmfheewunavtswy.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHhocW1maGVld3VuYXZ0c3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjE1ODAsImV4cCI6MjA5MDg5NzU4MH0.loelcDioTbCHuLTLwQ7ejTyJjBEkUllkDeurx3MTDS4';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
