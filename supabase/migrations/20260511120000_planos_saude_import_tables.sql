CREATE TABLE IF NOT EXISTS public.beneficiarios_plano_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT,
    nome TEXT,
    registro_operadora TEXT,
    tipo TEXT,
    sexo TEXT,
    data_nascimento DATE,
    idade INTEGER,
    inicio_vigencia DATE,
    plano_codigo TEXT,
    plano_descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.beneficiarios_plano_saude ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beneficiarios_plano_saude_all" ON public.beneficiarios_plano_saude;
CREATE POLICY "beneficiarios_plano_saude_all" ON public.beneficiarios_plano_saude FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.faturamento_plano_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_ano TEXT,
    numero_beneficiario TEXT,
    beneficiario_nome TEXT,
    cpf TEXT,
    plano TEXT,
    tipo TEXT,
    id_dependencia TEXT,
    dependencia TEXT,
    data_limite DATE,
    dt_inclusao DATE,
    rubrica TEXT,
    valor NUMERIC,
    valor_total NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.faturamento_plano_saude ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faturamento_plano_saude_all" ON public.faturamento_plano_saude;
CREATE POLICY "faturamento_plano_saude_all" ON public.faturamento_plano_saude FOR ALL TO authenticated USING (true) WITH CHECK (true);
