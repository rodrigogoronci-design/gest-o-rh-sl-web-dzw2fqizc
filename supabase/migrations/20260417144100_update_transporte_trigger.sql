CREATE OR REPLACE FUNCTION public.sync_ticket_to_transporte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recebe boolean;
  v_home_office_count integer := 0;
  v_start_date date;
  v_end_date date;
  v_year integer;
  v_month integer;
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Calculate the period for the month
  v_year := split_part(NEW.mes_ano, '-', 1)::integer;
  v_month := split_part(NEW.mes_ano, '-', 2)::integer;
  
  IF v_month = 1 THEN
    v_start_date := make_date(v_year - 1, 12, 25);
  ELSE
    v_start_date := make_date(v_year, v_month - 1, 25);
  END IF;
  
  v_end_date := make_date(v_year, v_month, 24);

  -- Check if the user is eligible for Vale Transporte
  SELECT recebe_transporte INTO v_recebe
  FROM public.colaboradores
  WHERE id = NEW.colaborador_id;

  -- Count global home office days
  SELECT count(*) INTO v_home_office_count
  FROM public.dias_home_office
  WHERE data >= v_start_date AND data <= v_end_date;

  IF v_recebe = true THEN
    INSERT INTO public.beneficios_transporte (
      colaborador_id, mes_ano, ferias, atestados, faltas, dias_uteis, home_office
    ) VALUES (
      NEW.colaborador_id, NEW.mes_ano, NEW.ferias, NEW.atestados, NEW.faltas, 20, v_home_office_count
    )
    ON CONFLICT (colaborador_id, mes_ano) DO NOTHING;
  END IF;
    
  RETURN NEW;
END;
$function$;
