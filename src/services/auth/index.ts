import { isSupabaseConfigured } from '../supabase/client'
import type { AuthService } from './AuthService'
import { localAuth } from './localAuth'
import { supabaseAuth } from './supabaseAuth'

/** The auth implementation for this build: real accounts when Supabase is configured, local stand-in otherwise. */
export const auth: AuthService = isSupabaseConfigured ? supabaseAuth : localAuth
