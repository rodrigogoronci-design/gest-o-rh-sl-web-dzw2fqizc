CREATE TABLE IF NOT EXISTS public.planos_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor_titular NUMERIC DEFAULT 0,
    valor_dependente NUMERIC DEFAULT 0,
    com_coparticipacao BOOLEAN DEFAULT false,
    padrao BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.colaborador_planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    plano_id UUID REFERENCES public.planos_saude(id) ON DELETE RESTRICT,
    data_adesao DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(colaborador_id)
);

CREATE TABLE IF NOT EXISTS public.dependentes_plano (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    data_nascimento DATE,
    parentesco TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_plano (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    detalhes JSONB,
    data_solicitacao TIMESTAMPTZ DEFAULT NOW(),
    aprovado_por UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    data_aprovacao TIMESTAMPTZ
);

ALTER TABLE public.planos_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependentes_plano ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_plano ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_saude_select" ON public.planos_saude;
CREATE POLICY "planos_saude_select" ON public.planos_saude FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "planos_saude_insert" ON public.planos_saude;
CREATE POLICY "planos_saude_insert" ON public.planos_saude FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "planos_saude_update" ON public.planos_saude;
CREATE POLICY "planos_saude_update" ON public.planos_saude FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "planos_saude_delete" ON public.planos_saude;
CREATE POLICY "planos_saude_delete" ON public.planos_saude FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "colab_planos_select" ON public.colaborador_planos;
CREATE POLICY "colab_planos_select" ON public.colaborador_planos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "colab_planos_insert" ON public.colaborador_planos;
CREATE POLICY "colab_planos_insert" ON public.colaborador_planos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "colab_planos_update" ON public.colaborador_planos;
CREATE POLICY "colab_planos_update" ON public.colaborador_planos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "colab_planos_delete" ON public.colaborador_planos;
CREATE POLICY "colab_planos_delete" ON public.colaborador_planos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "dep_planos_select" ON public.dependentes_plano;
CREATE POLICY "dep_planos_select" ON public.dependentes_plano FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dep_planos_insert" ON public.dependentes_plano;
CREATE POLICY "dep_planos_insert" ON public.dependentes_plano FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "dep_planos_update" ON public.dependentes_plano;
CREATE POLICY "dep_planos_update" ON public.dependentes_plano FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dep_planos_delete" ON public.dependentes_plano;
CREATE POLICY "dep_planos_delete" ON public.dependentes_plano FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "solic_planos_select" ON public.solicitacoes_plano;
CREATE POLICY "solic_planos_select" ON public.solicitacoes_plano FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "solic_planos_insert" ON public.solicitacoes_plano;
CREATE POLICY "solic_planos_insert" ON public.solicitacoes_plano FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "solic_planos_update" ON public.solicitacoes_plano;
CREATE POLICY "solic_planos_update" ON public.solicitacoes_plano FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "solic_planos_delete" ON public.solicitacoes_plano;
CREATE POLICY "solic_planos_delete" ON public.solicitacoes_plano FOR DELETE TO authenticated USING (true);
