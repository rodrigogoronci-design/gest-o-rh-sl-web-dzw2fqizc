DO $$
DECLARE
  rec RECORD;
  start_date DATE;
  end_date DATE;
  ferias_count INT;
  faltas_count INT;
BEGIN
  FOR rec IN SELECT DISTINCT colaborador_id, mes_ano FROM beneficios_ticket
  UNION SELECT DISTINCT colaborador_id, mes_ano FROM beneficios_transporte LOOP
    
    -- calculate start and end date for rec.mes_ano
    -- mes_ano is 'YYYY-MM'
    start_date := (substring(rec.mes_ano from 1 for 4) || '-' || substring(rec.mes_ano from 6 for 2) || '-01')::date;
    start_date := start_date - interval '1 month';
    start_date := (substring(start_date::text from 1 for 8) || '25')::date;
    
    end_date := (substring(rec.mes_ano from 1 for 4) || '-' || substring(rec.mes_ano from 6 for 2) || '-24')::date;
    
    -- count ferias
    SELECT count(DISTINCT g.d) INTO ferias_count
    FROM (
      SELECT generate_series(
        GREATEST(f.data_inicio, start_date),
        LEAST(f.data_fim, end_date),
        '1 day'::interval
      )::date AS d
      FROM ferias f
      WHERE f.colaborador_id = rec.colaborador_id
        AND f.data_inicio <= end_date
        AND f.data_fim >= start_date
    ) g;

    IF ferias_count IS NULL THEN ferias_count := 0; END IF;

    -- count faltas
    SELECT count(DISTINCT f.data) INTO faltas_count
    FROM faltas f
    WHERE f.colaborador_id = rec.colaborador_id
      AND f.data >= start_date
      AND f.data <= end_date;
      
    IF faltas_count IS NULL THEN faltas_count := 0; END IF;

    -- update beneficios_ticket
    UPDATE beneficios_ticket
    SET ferias = ferias_count, faltas = faltas_count
    WHERE colaborador_id = rec.colaborador_id AND mes_ano = rec.mes_ano 
      AND (ferias != ferias_count OR faltas != faltas_count);

    -- update beneficios_transporte
    UPDATE beneficios_transporte
    SET ferias = ferias_count, faltas = faltas_count
    WHERE colaborador_id = rec.colaborador_id AND mes_ano = rec.mes_ano 
      AND (ferias != ferias_count OR faltas != faltas_count);

  END LOOP;
END $$;
