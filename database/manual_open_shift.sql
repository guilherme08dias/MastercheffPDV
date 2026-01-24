-- ============================================================================
-- SCRIPT MANUAL: ABRIR TURNO DE EMERGENCIA
-- Execute este script no SQL Editor do Supabase para forçar a abertura de um turno.
-- ============================================================================

-- 1. FECHAR QUAISQUER TURNOS ABERTOS (Para evitar conflitos)
-- Isso garante que não teremos dois turnos com status 'open' ao mesmo tempo.
UPDATE public.shifts 
SET status = 'closed', closed_at = NOW() 
WHERE status = 'open';

-- 2. ABRIR NOVO TURNO
-- Insere um novo registro com status 'open'.
-- Ajuste o 'initial_float' (fundo de caixa / troco inicial) se necessário (ex: 100.00).
INSERT INTO public.shifts (opened_at, initial_float, status)
VALUES (NOW(), 100.00, 'open');

-- 3. CONFIRMAÇÃO
-- Mostra o turno recém criado para confirmar o sucesso.
SELECT * FROM public.shifts WHERE status = 'open';
