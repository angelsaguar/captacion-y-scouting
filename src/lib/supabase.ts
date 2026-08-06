import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isUrlValid = (url: any) => {
  if (typeof url !== 'string' || !url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

// Fail gracefully if environment variables are missing or invalid
if (!isUrlValid(supabaseUrl) || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing or invalid. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your secrets.'
  );
}

export const supabase = createClient(
  isUrlValid(supabaseUrl) ? supabaseUrl! : 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
