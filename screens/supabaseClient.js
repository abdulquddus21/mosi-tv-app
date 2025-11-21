import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://itxndrvoolbvzdseuljx.supabase.co'; // o'zgartiring
const SUPABASE_ANON_KEY = 'sb_publishable_7ytTy8Lvl51GdRHqV3GrtA_MrXjQIws'; // o'zgartiring

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);