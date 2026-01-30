import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Você precisa substituir estas chaves pelas do seu projeto Supabase
// Vá em Project Settings -> API no seu painel do Supabase.

// SEGURANÇA: Row Level Security (RLS) IMPLEMENTADO
// Políticas ativas em: orders, order_items, shifts, products, delivery_areas, addons
// SQL de políticas em: database/rls_policies.sql
// Docs: https://supabase.com/docs/guides/auth/row-level-security

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
