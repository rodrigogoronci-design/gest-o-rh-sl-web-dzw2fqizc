-- Adiciona políticas de UPDATE e DELETE faltantes para a tabela registro_ponto

DROP POLICY IF EXISTS "registro_ponto_update" ON public.registro_ponto;
CREATE POLICY "registro_ponto_update" ON public.registro_ponto
  FOR UPDATE TO authenticated
  USING (
    (colaborador_id = get_current_colaborador_id()) OR is_in_my_team(colaborador_id)
  )
  WITH CHECK (
    (colaborador_id = get_current_colaborador_id()) OR is_in_my_team(colaborador_id)
  );

DROP POLICY IF EXISTS "registro_ponto_delete" ON public.registro_ponto;
CREATE POLICY "registro_ponto_delete" ON public.registro_ponto
  FOR DELETE TO authenticated
  USING (
    (colaborador_id = get_current_colaborador_id()) OR is_in_my_team(colaborador_id)
  );
