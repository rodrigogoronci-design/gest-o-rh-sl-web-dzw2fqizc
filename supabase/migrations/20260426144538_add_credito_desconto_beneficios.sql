ALTER TABLE public.beneficios_ticket 
ADD COLUMN IF NOT EXISTS credito numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_justificativa text DEFAULT '',
ADD COLUMN IF NOT EXISTS desconto_justificativa text DEFAULT '';

ALTER TABLE public.beneficios_transporte 
ADD COLUMN IF NOT EXISTS credito numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito_justificativa text DEFAULT '',
ADD COLUMN IF NOT EXISTS desconto_justificativa text DEFAULT '';

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

  v_year := split_part(NEW.mes_ano, '-', 1)::integer;
  v_month := split_part(NEW.mes_ano, '-', 2)::integer;
  
  -- Use PREVIOUS cycle dates for Home Office as per new rules
  IF v_month = 1 THEN
    v_start_date := make_date(v_year - 1, 12, 25);
    v_end_date := make_date(v_year, 1, 24);
  ELSE
    v_start_date := make_date(v_year, v_month - 1, 25);
    v_end_date := make_date(v_year, v_month, 24);
  END IF;

  SELECT recebe_transporte INTO v_recebe
  FROM public.colaboradores
  WHERE id = NEW.colaborador_id;

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
