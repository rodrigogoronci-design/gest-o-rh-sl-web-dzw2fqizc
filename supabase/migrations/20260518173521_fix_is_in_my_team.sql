CREATE OR REPLACE FUNCTION public.is_in_my_team(target_colab_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  my_role TEXT;
  my_dept TEXT;
  target_dept TEXT;
  is_allowed_escala BOOLEAN := FALSE;
  my_colab_id TEXT;
  my_auth_id TEXT;
BEGIN
  my_auth_id := auth.uid()::text;
  SELECT id::text, role, departamento INTO my_colab_id, my_role, my_dept FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
  
  IF my_role ILIKE 'admin' OR my_role ILIKE 'administrador' THEN
    RETURN TRUE;
  END IF;

  IF my_role ILIKE 'gerente' THEN
    SELECT departamento INTO target_dept FROM public.colaboradores WHERE id = target_colab_id;
    IF target_dept = my_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF my_colab_id IS NOT NULL OR my_auth_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.configuracoes
      WHERE chave = 'app_permissions'
      AND (
        (my_colab_id IS NOT NULL AND valor->'allowedEscalaUsers' @> to_jsonb(my_colab_id))
        OR 
        (my_auth_id IS NOT NULL AND valor->'allowedEscalaUsers' @> to_jsonb(my_auth_id))
      )
    ) INTO is_allowed_escala;

    IF is_allowed_escala THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$function$;
