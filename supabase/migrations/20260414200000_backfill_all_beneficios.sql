DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  prev_start_date DATE;
  prev_end_date DATE;
  ferias_count INT;
  faltas_count INT;
  atestados_count INT;
  plantoes_count INT;
  colab RECORD;
BEGIN
  start_date := '2026-03-25'::date;
  end_date := '2026-04-24'::date;
  prev_start_date := '2026-02-25'::date;
  prev_end_date := '2026-03-24'::date;

  FOR colab IN SELECT id FROM public.colaboradores WHERE role IN ('Colaborador', 'user') LOOP
    
    -- count ferias
    SELECT count(DISTINCT g.d) INTO ferias_count
    FROM (
      SELECT generate_series(
        GREATEST(f.data_inicio, start_date),
        LEAST(f.data_fim, end_date),
        '1 day'::interval
      )::date AS d
      FROM public.ferias f
      WHERE f.colaborador_id = colab.id
        AND f.data_inicio <= end_date
        AND f.data_fim >= start_date
    ) g;

    IF ferias_count IS NULL THEN ferias_count := 0; END IF;

    -- count faltas
    SELECT count(DISTINCT f.data) INTO faltas_count
    FROM public.faltas f
    WHERE f.colaborador_id = colab.id
      AND f.data >= start_date
      AND f.data <= end_date;
      
    IF faltas_count IS NULL THEN faltas_count := 0; END IF;

    -- count atestados
    SELECT count(DISTINCT g.d) INTO atestados_count
    FROM (
      SELECT generate_series(
        GREATEST(a.data_inicio, prev_start_date),
        LEAST(a.data_fim, prev_end_date),
        '1 day'::interval
      )::date AS d
      FROM public.atestados a
      WHERE a.colaborador_id = colab.id
        AND a.data_inicio <= prev_end_date
        AND a.data_fim >= prev_start_date
    ) g;

    IF atestados_count IS NULL THEN atestados_count := 0; END IF;

    -- count plantoes
    SELECT count(DISTINCT p.data) INTO plantoes_count
    FROM public.plantoes p
    WHERE p.colaborador_id = colab.id
      AND p.data >= start_date
      AND p.data <= end_date;
      
    IF plantoes_count IS NULL THEN plantoes_count := 0; END IF;

    -- upsert beneficios_ticket
    INSERT INTO public.beneficios_ticket (colaborador_id, mes_ano, dias_uteis, plantoes, atestados, ferias, faltas)
    VALUES (colab.id, '2026-04', 20, plantoes_count, atestados_count, ferias_count, faltas_count)
    ON CONFLICT (colaborador_id, mes_ano) 
    DO UPDATE SET 
      ferias = EXCLUDED.ferias, 
      faltas = EXCLUDED.faltas, 
      atestados = EXCLUDED.atestados, 
      plantoes = EXCLUDED.plantoes;

    -- upsert beneficios_transporte
    INSERT INTO public.beneficios_transporte (colaborador_id, mes_ano, dias_uteis, home_office, atestados, ferias, faltas)
    VALUES (colab.id, '2026-04', 20, 0, atestados_count, ferias_count, faltas_count)
    ON CONFLICT (colaborador_id, mes_ano) 
    DO UPDATE SET 
      ferias = EXCLUDED.ferias, 
      faltas = EXCLUDED.faltas, 
      atestados = EXCLUDED.atestados;

  END LOOP;
END $$;
