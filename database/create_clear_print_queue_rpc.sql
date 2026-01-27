-- FUNCAO: ZERAR FILA DE IMPRESSAO (KILL SWITCH)
-- Permite que o staff limpe a fila caso a impressora trave ou entre em loop.

CREATE OR REPLACE FUNCTION clear_print_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissoes de admin
AS $$
BEGIN
    UPDATE orders 
    SET printed = true, 
        printed_at = NOW() 
    WHERE printed = false;
END;
$$;

-- Permissoes: Apenas usuários autenticados (Staff/Admin) podem chamar
GRANT EXECUTE ON FUNCTION clear_print_queue TO authenticated;
GRANT EXECUTE ON FUNCTION clear_print_queue TO service_role;
-- Nota: NÃO dar permissão para 'anon' (apenas staff logado pode zerar a fila)
