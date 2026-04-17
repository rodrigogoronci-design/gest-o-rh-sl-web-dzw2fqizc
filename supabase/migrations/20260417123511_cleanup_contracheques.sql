DO $$
BEGIN
  -- 1. Exclusão de Registros Administrativos: Remove Ismael Bomfim e Administradores do histórico de contracheques
  DELETE FROM public.contracheques
  WHERE colaborador_id IN (
    SELECT id FROM public.colaboradores 
    WHERE nome ILIKE '%Ismael Bomfim%' OR role = 'Admin'
  );

  -- 2. Limpeza do Histórico: Remove Brunella e João Estagiário para o mês 02/2026
  DELETE FROM public.contracheques
  WHERE mes_ano = '02/2026'
    AND colaborador_id IN (
      SELECT id FROM public.colaboradores 
      WHERE nome ILIKE '%Brunella%' 
         OR nome ILIKE '%João Estagiário%'
         OR nome ILIKE '%Joao Estagiario%'
    );

  -- 3. Limpeza de registros fantasmas que possam ter sido gerados sem arquivo na importação
  DELETE FROM public.contracheques
  WHERE arquivo_url IS NULL OR TRIM(arquivo_url) = '';

END $$;
