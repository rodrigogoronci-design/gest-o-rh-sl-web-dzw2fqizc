import { supabase } from '@/lib/supabase/client'

export const getPlanos = async () => {
  const { data, error } = await supabase
    .from('planos_saude')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const savePlano = async (plano: any) => {
  if (plano.id) {
    const { data, error } = await supabase
      .from('planos_saude')
      .update(plano)
      .eq('id', plano.id)
      .select()
    if (error) throw error
    return data[0]
  } else {
    const { data, error } = await supabase.from('planos_saude').insert(plano).select()
    if (error) throw error
    return data[0]
  }
}

export const saveBeneficiariosBatch = async (beneficiarios: any[]) => {
  const { error } = await supabase.from('beneficiarios_plano_saude').insert(beneficiarios)
  if (error) throw error
}

export const saveFaturamentoBatch = async (faturamentos: any[]) => {
  const { error } = await supabase.from('faturamento_plano_saude').insert(faturamentos)
  if (error) throw error
}

export const deletePlano = async (id: string) => {
  const { error } = await supabase.from('planos_saude').delete().eq('id', id)
  if (error) throw error
}

export const getColaboradorPlano = async (colabId: string) => {
  const { data, error } = await supabase
    .from('colaborador_planos')
    .select('*, plano:plano_id(*)')
    .eq('colaborador_id', colabId)
    .eq('status', 'ativo')
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const getDependentes = async (colabId: string) => {
  const { data, error } = await supabase
    .from('dependentes_plano')
    .select('*')
    .eq('colaborador_id', colabId)
    .eq('status', 'ativo')
  if (error) throw error
  return data
}

export const solicitarAdesao = async (colaborador_id: string, plano_id: string) => {
  const { data, error } = await supabase.from('solicitacoes_plano').insert({
    colaborador_id,
    tipo: 'adesao',
    detalhes: { plano_id },
  })
  if (error) throw error
  return data
}

export const solicitarCancelamento = async (colaborador_id: string) => {
  const { data, error } = await supabase.from('solicitacoes_plano').insert({
    colaborador_id,
    tipo: 'cancelamento',
    detalhes: {},
  })
  if (error) throw error
  return data
}

export const solicitarDependente = async (
  colaborador_id: string,
  dependente: any,
  tipo: 'add_dependente' | 'rem_dependente',
) => {
  const { data, error } = await supabase.from('solicitacoes_plano').insert({
    colaborador_id,
    tipo,
    detalhes: dependente,
  })
  if (error) throw error
  return data
}

export const getSolicitacoes = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_plano')
    .select('*, colaborador:colaborador_id(nome)')
    .eq('status', 'pendente')
    .order('data_solicitacao', { ascending: false })
  if (error) throw error
  return data
}

export const responderSolicitacao = async (
  id: string,
  status: 'aprovado' | 'rejeitado',
  adminId: string,
) => {
  const { data, error } = await supabase
    .from('solicitacoes_plano')
    .update({
      status,
      aprovado_por: adminId,
      data_aprovacao: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const processarAprovacao = async (solicitacao: any) => {
  if (solicitacao.tipo === 'adesao') {
    await supabase.from('colaborador_planos').upsert(
      {
        colaborador_id: solicitacao.colaborador_id,
        plano_id: solicitacao.detalhes.plano_id,
        status: 'ativo',
      },
      { onConflict: 'colaborador_id' },
    )
  } else if (solicitacao.tipo === 'cancelamento') {
    await supabase
      .from('colaborador_planos')
      .update({ status: 'cancelado' })
      .eq('colaborador_id', solicitacao.colaborador_id)
  } else if (solicitacao.tipo === 'add_dependente') {
    await supabase.from('dependentes_plano').insert({
      colaborador_id: solicitacao.colaborador_id,
      nome: solicitacao.detalhes.nome,
      cpf: solicitacao.detalhes.cpf,
      parentesco: solicitacao.detalhes.parentesco,
      data_nascimento: solicitacao.detalhes.data_nascimento,
    })
  } else if (solicitacao.tipo === 'rem_dependente') {
    await supabase
      .from('dependentes_plano')
      .update({ status: 'inativo' })
      .eq('id', solicitacao.detalhes.id)
  }
}
