// This file centralizes the application's global state management (Zustand store)
// to prevent "require cycle" warnings.

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

// Define the structure of the user profile object
export interface Profile {
  id: string;
  username: string;
  role: 'user' | 'support' | 'moderator' | 'admin' | 'super_admin';
  is_available_for_support: boolean;
}

// Define the structure of the global app state
export interface AppState {
  session: Session | null;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
}

// Create and export the store
export const useStore = create<AppState>((set) => ({
  session: null,
  profile: null,
  // When a session is set (e.g., login), or cleared (logout), also clear the profile
  setSession: (session) => set({ session, profile: null }),
  setProfile: (profile) => set({ profile }),
}));
