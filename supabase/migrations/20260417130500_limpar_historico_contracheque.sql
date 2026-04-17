DO $$
BEGIN
  -- Remover contracheques de administradores e gerentes, exceto o Rodrigo
  DELETE FROM public.contracheques
  WHERE colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE (role ILIKE 'admin' OR role ILIKE 'gerente')
    AND nome NOT ILIKE '%rodrigo%'
  );

  -- Remover contracheques específicos que não devem estar no histórico (Brunella, João Estagiário, Ismael)
  DELETE FROM public.contracheques
  WHERE colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE nome ILIKE '%brunella%' 
       OR nome ILIKE '%joão estagiário%' 
       OR nome ILIKE '%joao estagiario%'
       OR nome ILIKE '%ismael bomfim%'
  );
END $$;
