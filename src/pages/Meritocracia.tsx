import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Star, TrendingUp, Clock, AlertTriangle, UserMinus, CheckCircle2 } from 'lucide-react'

export default function MeritocraciaDashboard() {
  const currentDate = new Date()
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [valorBase, setValorBase] = useState(700)
  const [cancelamentos, setCancelamentos] = useState<any[]>([])
  const [novoCliente, setNovoCliente] = useState('')
  const [loading, setLoading] = useState(true)

  const getCycleDates = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-').map(Number)
      const prevDate = new Date(year, month - 2, 25)
      const currDate = new Date(year, month - 1, 24)
      const formatDt = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      return `${formatDt(prevDate)} a ${formatDt(currDate)}`
    } catch (e) {
      return ''
    }
  }

  const fetchDados = async () => {
    setLoading(true)
    const [{ data: cfg }, { data: canc }] = await Promise.all([
      supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'meritocracia_valor_base')
        .single(),
      supabase
        .from('meritocracia_cancelamentos' as any)
        .select('*')
        .eq('mes_ano', selectedMonth)
        .order('created_at', { ascending: false }),
    ])

    if (cfg?.valor?.amount) setValorBase(cfg.valor.amount)
    if (canc) setCancelamentos(canc)
    setLoading(false)
  }

  useEffect(() => {
    fetchDados()
  }, [selectedMonth])

  const saveValorBase = async () => {
    await supabase
      .from('configuracoes')
      .upsert({ chave: 'meritocracia_valor_base', valor: { amount: valorBase } })
    toast.success('Valor base atualizado globalmente.')
  }

  const handleAddCancelamento = async () => {
    if (!novoCliente.trim()) return toast.error('Informe o nome do cliente')

    const { error } = await supabase.from('meritocracia_cancelamentos' as any).insert({
      mes_ano: selectedMonth,
      cliente_nome: novoCliente.trim(),
    })

    if (error) {
      toast.error('Erro ao salvar cancelamento')
    } else {
      toast.success('Cancelamento registrado')
      setNovoCliente('')
      fetchDados()
    }
  }

  const removeCancelamento = async (id: string) => {
    const { error } = await supabase
      .from('meritocracia_cancelamentos' as any)
      .delete()
      .eq('id', id)
    if (!error) {
      toast.success('Registro removido')
      fetchDados()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meritocracia - Visão Geral</h1>
          <p className="text-muted-foreground">
            Dashboard, configurações e lançamentos globais do ciclo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <span className="text-sm font-medium text-slate-600">Valor Total:</span>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-sm text-slate-500">R$</span>
              <Input
                type="number"
                value={valorBase}
                onChange={(e) => setValorBase(Number(e.target.value))}
                onBlur={saveValorBase}
                className="w-24 h-8 pl-8 pr-2 text-right font-medium border-slate-200"
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40 h-8"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium px-1">
              Ciclo: {getCycleDates(selectedMonth)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Projeções do Mês (Destaques)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">João S.</div>
                  <p className="text-xs font-medium text-slate-500">Mais Atendimentos</p>
                </div>
                <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md w-fit">
                  145 Tickets Resolvidos
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">Maria P.</div>
                  <p className="text-xs font-medium text-slate-500">Tempo de Resolução</p>
                </div>
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md w-fit">
                  Média: 1h 20m
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">8 Alertas</div>
                  <p className="text-xs font-medium text-slate-500">Tempo de Permanência</p>
                </div>
                <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md w-fit">
                  Tickets acima da média
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-50 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
              <TrendingUp className="w-12 h-12 mb-3 text-slate-300" />
              <p className="max-w-sm">
                Os cálculos detalhados e gráficos de projeção serão alimentados automaticamente
                pelas planilhas de importação nos setores.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-red-100 shadow-sm h-full flex flex-col">
            <CardHeader className="bg-red-50/50 pb-4 border-b border-red-50">
              <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                <UserMinus className="w-5 h-5 text-red-600" />
                Cancelamentos de Cliente
              </CardTitle>
              <CardDescription className="text-xs">
                Lançamentos neste ciclo geram um desconto único de <strong>R$ 105,00</strong> para
                todos os colaboradores.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col">
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Nome do cliente..."
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCancelamento()}
                  className="h-9"
                />
                <Button
                  onClick={handleAddCancelamento}
                  className="h-9 whitespace-nowrap bg-red-600 hover:bg-red-700"
                >
                  Registrar
                </Button>
              </div>

              <div className="space-y-3 flex-1 overflow-auto">
                {loading ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    Carregando...
                  </div>
                ) : cancelamentos.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    Nenhum cancelamento registrado neste ciclo.
                  </div>
                ) : (
                  cancelamentos.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-1 p-3 border border-red-100 bg-white rounded-lg shadow-sm group"
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className="text-sm font-semibold text-slate-800 line-clamp-1"
                          title={c.cliente_nome}
                        >
                          {c.cliente_nome}
                        </span>
                        <button
                          onClick={() => removeCancelamento(c.id)}
                          className="text-[10px] text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remover
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Data: {new Date(c.data_cancelamento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {cancelamentos.length > 0 && (
                <div className="mt-4 pt-3 border-t border-red-100 text-xs font-medium text-red-700 flex justify-between">
                  <span>Status do Desconto:</span>
                  <span>ATIVO (-R$ 105,00)</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
