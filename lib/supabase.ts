import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Você precisa substituir estas chaves pelas do seu projeto Supabase
// Vá em Project Settings -> API no seu painel do Supabase.

// TODO: SEGURANÇA - Implementar Row Level Security (RLS) no console do Supabase
// Tabelas que PRECISAM de RLS: 'orders', 'order_items', 'shifts', 'products', 'profiles'
// Sem RLS, qualquer usuário com a anon_key pode manipular dados diretamente.
// Docs: https://supabase.com/docs/guides/auth/row-level-security

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
