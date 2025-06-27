// This file centralizes the Supabase client initialization
// to prevent "require cycle" warnings in the app.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This alert is for development convenience.
  // In a production app, you might handle this more gracefully.
  alert("CRITICAL ERROR: Supabase URL or Anon Key is missing. Please check your .env file and restart the app.");
}

// Initialize the client and export it for use in other files.
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);