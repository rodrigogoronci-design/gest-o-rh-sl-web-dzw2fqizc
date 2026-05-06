DO $$
BEGIN
    DROP POLICY IF EXISTS "afastamentos_update" ON public.afastamentos;
    CREATE POLICY "afastamentos_update" ON public.afastamentos
      FOR UPDATE TO authenticated
      USING (is_in_my_team(colaborador_id) OR colaborador_id = get_current_colaborador_id())
      WITH CHECK (is_in_my_team(colaborador_id) OR colaborador_id = get_current_colaborador_id());

    DROP POLICY IF EXISTS "afastamentos_delete" ON public.afastamentos;
    CREATE POLICY "afastamentos_delete" ON public.afastamentos
      FOR DELETE TO authenticated
      USING (is_in_my_team(colaborador_id) OR colaborador_id = get_current_colaborador_id());
END $$;
