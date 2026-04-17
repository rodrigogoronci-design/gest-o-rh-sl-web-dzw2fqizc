DO $$
BEGIN
  -- Remover registros indesejados existentes
  DELETE FROM public.contracheques
  WHERE colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE nome ILIKE '%joão%estagi%'
       OR nome ILIKE '%joao%estagi%'
       OR nome ILIKE '%joã%estagi%'
       OR nome ILIKE '%brunella%'
       OR nome ILIKE '%ismael bomfim%'
       OR ((role ILIKE 'admin' OR role ILIKE 'gerente') AND nome NOT ILIKE '%rodrigo%')
  );
END $$;

CREATE OR REPLACE FUNCTION public.prevent_unwanted_contracheques()
RETURNS trigger AS $$
DECLARE
  v_nome text;
  v_role text;
BEGIN
  SELECT nome, role INTO v_nome, v_role
  FROM public.colaboradores
  WHERE id = NEW.colaborador_id;

  -- Bloquear João Estagiário e variações (incluindo "Joã estagiaio")
  IF v_nome ILIKE '%joão%estagi%' OR v_nome ILIKE '%joao%estagi%' OR v_nome ILIKE '%joã%estagi%' THEN
    RETURN NULL;
  END IF;

  -- Bloquear Brunella
  IF v_nome ILIKE '%brunella%' THEN
    RETURN NULL;
  END IF;

  -- Bloquear Ismael Bomfim
  IF v_nome ILIKE '%ismael bomfim%' THEN
    RETURN NULL;
  END IF;

  -- Bloquear Administradores e Gerentes, exceto Rodrigo
  IF (v_role ILIKE 'admin' OR v_role ILIKE 'gerente') AND v_nome NOT ILIKE '%rodrigo%' THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_unwanted_contracheques ON public.contracheques;
CREATE TRIGGER trg_prevent_unwanted_contracheques
  BEFORE INSERT OR UPDATE ON public.contracheques
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unwanted_contracheques();
