-- Migration to sync ferias, atestados, and faltas between beneficios_ticket and beneficios_transporte

CREATE OR REPLACE FUNCTION public.sync_ticket_to_transporte()
RETURNS trigger AS $$
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.beneficios_transporte (
    colaborador_id, mes_ano, ferias, atestados, faltas, dias_uteis, home_office
  ) VALUES (
    NEW.colaborador_id, NEW.mes_ano, NEW.ferias, NEW.atestados, NEW.faltas, 20, 0
  )
  ON CONFLICT (colaborador_id, mes_ano) DO UPDATE SET
    ferias = EXCLUDED.ferias,
    atestados = EXCLUDED.atestados,
    faltas = EXCLUDED.faltas
  WHERE 
    public.beneficios_transporte.ferias IS DISTINCT FROM EXCLUDED.ferias OR
    public.beneficios_transporte.atestados IS DISTINCT FROM EXCLUDED.atestados OR
    public.beneficios_transporte.faltas IS DISTINCT FROM EXCLUDED.faltas;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_changes_sync_transporte ON public.beneficios_ticket;
CREATE TRIGGER on_ticket_changes_sync_transporte
AFTER INSERT OR UPDATE OF ferias, atestados, faltas ON public.beneficios_ticket
FOR EACH ROW
EXECUTE FUNCTION public.sync_ticket_to_transporte();


CREATE OR REPLACE FUNCTION public.sync_transporte_to_ticket()
RETURNS trigger AS $$
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.beneficios_ticket (
    colaborador_id, mes_ano, ferias, atestados, faltas, dias_uteis, plantoes
  ) VALUES (
    NEW.colaborador_id, NEW.mes_ano, NEW.ferias, NEW.atestados, NEW.faltas, 20, 0
  )
  ON CONFLICT (colaborador_id, mes_ano) DO UPDATE SET
    ferias = EXCLUDED.ferias,
    atestados = EXCLUDED.atestados,
    faltas = EXCLUDED.faltas
  WHERE 
    public.beneficios_ticket.ferias IS DISTINCT FROM EXCLUDED.ferias OR
    public.beneficios_ticket.atestados IS DISTINCT FROM EXCLUDED.atestados OR
    public.beneficios_ticket.faltas IS DISTINCT FROM EXCLUDED.faltas;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transporte_changes_sync_ticket ON public.beneficios_transporte;
CREATE TRIGGER on_transporte_changes_sync_ticket
AFTER INSERT OR UPDATE OF ferias, atestados, faltas ON public.beneficios_transporte
FOR EACH ROW
EXECUTE FUNCTION public.sync_transporte_to_ticket();
