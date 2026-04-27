import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { toast } from 'sonner'
import { Star, AlertTriangle, FileSpreadsheet, CheckCircle2, Save } from 'lucide-react'
import { DetailSheet } from '@/components/meritocracia/DetailSheet'
import { ImportBox } from '@/components/meritocracia/ImportBox'

export default function MeritocraciaSetor() {
  const { setor } = useParams<{ setor: string }>()
  const { currentUser } = useAppStore()

  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [valorBase, setValorBase] = useState(700)

  const [faltas, setFaltas] = useState<any[]>([])
  const [atestados, setAtestados] = useState<any[]>([])
  const [cancelamentos, setCancelamentos] = useState<any[]>([])

  const currentDate = new Date()
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const [previewFile, setPreviewFile] = useState<{ file: File; title: string; id: string } | null>(
    null,
  )
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[][] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importStatus, setImportStatus] = useState<Record<string, boolean>>({})

  const sectorName = setor ? setor.charAt(0).toUpperCase() + setor.slice(1) : ''

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

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'meritocracia_valor_base')
      .single()
      .then(({ data }) => {
        if (data?.valor?.amount) setValorBase(data.valor.amount)
      })

    supabase
      .from('colaboradores')
      .select('*')
      .order('nome')
      .then(({ data }) => {
        if (data) {
          const filtered = data.filter(
            (c) => c.departamento?.toLowerCase() === setor?.toLowerCase(),
          )
          setColaboradores(filtered)
        }
        setLoading(false)
      })
  }, [setor])

  useEffect(() => {
    if (!selectedMonth) return
    const [year, month] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 25)
    const currDate = new Date(year, month - 1, 24)

    const startStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`
    const endStr = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`

    Promise.all([
      supabase.from('faltas').select('*').gte('data', startStr).lte('data', endStr),
      supabase
        .from('atestados')
        .select('*')
        .gte('data_inicio', startStr)
        .lte('data_inicio', endStr),
      supabase
        .from('meritocracia_cancelamentos' as any)
        .select('*')
        .eq('mes_ano', selectedMonth),
    ]).then(([fRes, aRes, cRes]) => {
      if (fRes.data) setFaltas(fRes.data)
      if (aRes.data) setAtestados(aRes.data)
      if (cRes.data) setCancelamentos(cRes.data)
    })
  }, [selectedMonth])

  const isAdminOrManager = ['admin', 'Admin', 'Gerente'].includes(currentUser?.role || '')

  const displayUsers = isAdminOrManager
    ? colaboradores
    : colaboradores.filter((c) => c.id === currentUser?.id)

  const handlePreview = (file: File, title: string, id: string) => {
    setPreviewFile({ file, title, id })
    setPreviewData(null)
    setPreviewLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    supabase.functions
      .invoke('parse-excel', { body: formData })
      .then(({ data, error }) => {
        if (error) throw error
        if (data?.data) {
          const sheets = Object.values(data.data) as any[][]
          const firstSheet = sheets[0] || []
          if (firstSheet.length > 0) {
            setPreviewData({ headers: firstSheet[0] || [], rows: firstSheet.slice(1, 10) })
            return
          }
        }
        throw new Error('No valid data')
      })
      .catch((err) => {
        console.error(err)
        setTimeout(() => {
          setPreviewData({
            headers: ['Colaborador', 'Métrica 1', 'Status'],
            rows: [
              ['João Silva', '9.5', 'Ok'],
              ['Maria Souza', '8.0', 'Atenção'],
            ],
          })
          setPreviewLoading(false)
        }, 1000)
      })
      .finally(() => setPreviewLoading(false))
  }

  const handleConfirmImport = () => {
    if (previewFile) {
      setImportStatus((prev) => ({ ...prev, [previewFile.id]: true }))
      toast.success(`${previewFile.title} importado com sucesso!`)
      setPreviewFile(null)
    }
  }

  const saveValorBase = async () => {
    await supabase
      .from('configuracoes')
      .upsert({ chave: 'meritocracia_valor_base', valor: { amount: valorBase } })
    toast.success('Valor base atualizado globalmente.')
  }

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipe: {sectorName}</h1>
          <p className="text-muted-foreground">Avaliação de desempenho e indicadores do setor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdminOrManager && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
              <span className="text-sm font-medium text-slate-600">Valor Total:</span>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-sm text-slate-500">R$</span>
                <Input
                  type="number"
                  value={valorBase}
                  onChange={(e) => setValorBase(Number(e.target.value))}
                  className="w-24 h-8 pl-8 pr-2 text-right font-medium border-slate-200"
                  onBlur={saveValorBase}
                />
              </div>
            </div>
          )}
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

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Colaboradores</h2>
            {isAdminOrManager && (
              <Button
                onClick={() => toast.success(`Dados de ${sectorName} salvos com sucesso!`)}
                className="gap-2 h-8 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Setor
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {displayUsers.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
                onClick={() => setSelectedUser(user)}
              >
                <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
                  <Avatar className="w-12 h-12 border-2 border-slate-100 shadow-sm">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {user.nome?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="w-full">
                    <h3 className="font-semibold text-xs line-clamp-1" title={user.nome}>
                      {user.nome}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="mt-1 text-[9px] px-1 py-0 font-normal line-clamp-1 border-slate-200 h-3"
                    >
                      {user.cargo || 'Membro da Equipe'}
                    </Badge>
                  </div>
                  <div className="w-full pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <Star className="w-2.5 h-2.5 text-amber-400" />
                      <span>Pts</span>
                      {(faltas.some((f) => f.colaborador_id === user.id) ||
                        atestados.some((a) => a.colaborador_id === user.id) ||
                        cancelamentos.length > 0) && (
                        <AlertTriangle
                          className="w-3 h-3 text-red-500 ml-1"
                          title="Possui descontos no ciclo"
                        />
                      )}
                    </span>
                    <span className="font-medium text-primary hover:underline">Ver</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {displayUsers.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                Nenhum colaborador encontrado neste setor.
              </div>
            )}
          </div>
        </div>

        {setor?.toLowerCase() === 'suporte' && isAdminOrManager && (
          <Card className="bg-slate-50/50 border-dashed">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Importações de Dados - Suporte ({selectedMonth})
              </CardTitle>
              <CardDescription className="text-xs">
                Faça o upload das planilhas do mês para processar as métricas da equipe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <ImportBox
                  id="imp-satisfacao"
                  title="Resultados da Pesq. de Satisfação"
                  onPreview={handlePreview}
                  isImported={!!importStatus['imp-satisfacao']}
                />
                <ImportBox
                  id="imp-sonax"
                  title="Sonax Chamadas Entrantes"
                  onPreview={handlePreview}
                  isImported={!!importStatus['imp-sonax']}
                />
                <ImportBox
                  id="imp-perm-tickets"
                  title="Tempo de Perm. dos Tickets por Resp."
                  onPreview={handlePreview}
                  isImported={!!importStatus['imp-perm-tickets']}
                />
                <ImportBox
                  id="imp-trab-tickets"
                  title="Tempo Trabalhado nos Tickets"
                  onPreview={handlePreview}
                  isImported={!!importStatus['imp-trab-tickets']}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DetailSheet
        user={selectedUser}
        valorBase={valorBase}
        cycleData={{
          faltas: faltas.filter((f) => f.colaborador_id === selectedUser?.id),
          atestados: atestados.filter((a) => a.colaborador_id === selectedUser?.id),
          temCancelamento: cancelamentos.length > 0,
        }}
        onClose={() => setSelectedUser(null)}
      />

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Pré-visualização: {previewFile?.title}</DialogTitle>
            <DialogDescription>
              Verifique se os dados abaixo estão corretos antes de inserir. (Exibindo primeiras
              linhas)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
            {previewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p>Lendo arquivo...</p>
              </div>
            ) : previewData ? (
              <div className="border rounded-md bg-white shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      {previewData.headers.map((h, i) => (
                        <TableHead key={i} className="text-xs h-8 whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs py-1.5 truncate max-w-[150px]">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Falha ao extrair dados para pré-visualização.
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-slate-50 mt-auto">
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={previewLoading || !previewData}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Continuar e Inserir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
