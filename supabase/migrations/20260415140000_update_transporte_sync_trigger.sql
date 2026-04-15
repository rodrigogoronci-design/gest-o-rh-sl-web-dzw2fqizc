CREATE OR REPLACE FUNCTION public.sync_ticket_to_transporte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recebe boolean;
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Check if the user is eligible for Vale Transporte
  SELECT recebe_transporte INTO v_recebe
  FROM public.colaboradores
  WHERE id = NEW.colaborador_id;

  IF v_recebe = true THEN
    INSERT INTO public.beneficios_transporte (
      colaborador_id, mes_ano, ferias, atestados, faltas, dias_uteis, home_office
    ) VALUES (
      NEW.colaborador_id, NEW.mes_ano, NEW.ferias, NEW.atestados, NEW.faltas, 20, 0
    )
    ON CONFLICT (colaborador_id, mes_ano) DO NOTHING;
  END IF;
    
  RETURN NEW;
END;
$function$;
