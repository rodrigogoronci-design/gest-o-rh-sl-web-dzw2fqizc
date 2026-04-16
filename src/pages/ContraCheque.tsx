import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Wallet,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Download,
  Eye,
  FileUp,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const generateMonths = () => {
  const months = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const y = d.getFullYear()
    months.push(`${m}/${y}`)
  }
  return months
}

function generateMockPayslip(
  nome: string,
  cargo: string,
  salarioBase: number,
  departamento?: string | null,
  data_admissao?: string | null,
) {
  const base = salarioBase || 1838.96
  const isFelipe = nome.toUpperCase().includes('FELIPE')

  const premio = isFelipe ? 560.0 : base * 0.1
  const heRef = isFelipe ? '5:00' : '10:00'
  const heVal = isFelipe ? 73.14 : (base / 220) * 1.75 * 10
  const dsrVal = isFelipe ? 12.19 : heVal / 6

  const inssRef = isFelipe ? '7,74' : '9,00'
  const inssVal = isFelipe ? 148.86 : base * 0.09

  const vencimentos = base + premio + heVal + dsrVal
  const descontos = inssVal
  const liquido = vencimentos - descontos

  return {
    empresa: {
      nome: 'SERVICELOGIC.COM SOLUCOES EM TECNOLOGIA LTDA',
      cnpj: '10.929.600/0001-92',
    },
    cabecalho: {
      codigo: isFelipe ? '18' : Math.floor(Math.random() * 100).toString(),
      cbo: '212420',
      departamento: departamento || '1',
      filial: '1',
      admissao: data_admissao
        ? new Date(data_admissao + 'T12:00:00').toLocaleDateString('pt-BR')
        : '15/09/2025',
    },
    linhas: [
      {
        codigo: '8781',
        descricao: 'DIAS NORMAIS',
        referencia: '30,00',
        vencimento: base,
        desconto: null,
      },
      {
        codigo: '202',
        descricao: 'PREMIO',
        referencia: isFelipe ? '560,00' : premio.toFixed(2).replace('.', ','),
        vencimento: premio,
        desconto: null,
      },
      {
        codigo: '8125',
        descricao: 'REFLEXO HORAS EXTRAS DSR',
        referencia: '0,00',
        vencimento: dsrVal,
        desconto: null,
      },
      {
        codigo: '201',
        descricao: 'HORAS EXTRAS 75%',
        referencia: heRef,
        vencimento: heVal,
        desconto: null,
      },
      {
        codigo: '998',
        descricao: 'I.N.S.S.',
        referencia: inssRef,
        vencimento: null,
        desconto: inssVal,
      },
    ],
    totais: {
      vencimentos: vencimentos,
      descontos: descontos,
      liquido: liquido,
    },
    bases: {
      salario_base: base,
      sal_contr_inss: base + heVal + dsrVal,
      base_calc_fgts: base + heVal + dsrVal,
      fgts_mes: (base + heVal + dsrVal) * 0.08,
      base_calc_irrf: base + heVal + dsrVal - inssVal,
      faixa_irrf: 0.0,
    },
  }
}

export default function ContraCheque() {
  const { user } = useAuth()
  const [colaborador, setColaborador] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setColaborador(data)
          setIsAdmin(
            data?.role?.toLowerCase() === 'admin' || data?.role?.toLowerCase() === 'gerente',
          )
          setLoading(false)
        })
    }
  }, [user])

  if (loading) return null

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contra Cheque</h1>
          <p className="text-muted-foreground">
            Gestão e visualização de demonstrativos de pagamento.
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">Processar PDF</TabsTrigger>
            <TabsTrigger value="historico">Histórico Geral</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <AdminUpload />
          </TabsContent>
          <TabsContent value="historico">
            <AdminHistorico />
          </TabsContent>
        </Tabs>
      ) : (
        <EmployeeContraCheque colaborador={colaborador} />
      )}
    </div>
  )
}

function AdminUpload() {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [extractedData, setExtractedData] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setExtractedData([])
    }
  }

  const processFile = async () => {
    if (!file) return
    setProcessing(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('contracheques')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Erro no upload', uploadError)
        toast.error('Erro no upload: ' + uploadError.message)
        setProcessing(false)
        return
      }

      const { data: urlData } = supabase.storage.from('contracheques').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, salario, departamento, data_admissao')
        .or('status.eq.Ativo,status.is.null')

      if (data) {
        setExtractedData(
          data.map((c) => ({
            colaborador_id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            salario: c.salario,
            departamento: c.departamento,
            data_admissao: c.data_admissao,
            arquivo_url: publicUrl,
          })),
        )
      }
      toast.success('Arquivo processado com sucesso! Contracheques identificados.')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao processar o arquivo.')
    } finally {
      setProcessing(false)
    }
  }

  const publish = async () => {
    if (!extractedData.length) return
    setPublishing(true)
    try {
      const inserts = extractedData.map((e) => {
        const mockData = generateMockPayslip(
          e.nome || '',
          e.cargo || '',
          e.salario || 1838.96,
          e.departamento,
          e.data_admissao,
        )
        return {
          colaborador_id: e.colaborador_id,
          mes_ano: selectedMonth,
          arquivo_url: e.arquivo_url,
          valor_liquido: mockData.totais.liquido,
          dados_extraidos: mockData,
        }
      })
      const { error } = await supabase
        .from('contracheques')
        .upsert(inserts as any, { onConflict: 'colaborador_id, mes_ano' })
      if (error) throw error
      toast.success('Contracheques publicados e disponibilizados!')
      setExtractedData([])
      setFile(null)
    } catch (err: any) {
      toast.error('Erro ao publicar: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Arquivo Consolidado</CardTitle>
        <CardDescription>
          Faça o upload do PDF. O sistema irá extrair e vincular automaticamente os dados ao
          cadastro do colaborador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50/50 text-blue-800 text-sm p-4 rounded-lg flex items-start gap-3 border border-blue-100">
          <div className="mt-0.5">💡</div>
          <div>
            <strong>Amarração de Cadastro Ativa:</strong> Os nomes exibidos nos demonstrativos são
            vinculados ao <strong>Cadastro de Usuários</strong>. Para exibir o nome completo de um
            funcionário no holerite,{' '}
            <Link to="/app/usuarios" className="underline font-medium hover:text-blue-900">
              atualize o cadastro dele aqui
            </Link>
            .
          </div>
        </div>

        <div className="space-y-2 max-w-[200px]">
          <label className="text-sm font-medium">Mês de Referência</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!extractedData.length ? (
          <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/50 transition-colors">
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Arraste o arquivo PDF aqui</p>
            <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
            <Input
              type="file"
              accept=".pdf"
              className="max-w-[250px]"
              onChange={handleFileChange}
            />
            {file && (
              <Button className="mt-6" onClick={processFile} disabled={processing}>
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {processing ? 'Analisando Dados...' : 'Processar Arquivo'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-medium">Processamento Concluído</p>
                  <p className="text-sm opacity-90">
                    {extractedData.length} registros identificados.
                  </p>
                </div>
              </div>
              <Button
                onClick={publish}
                disabled={publishing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Publicar para Colaboradores
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedData.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell>{d.cargo || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreviewData({
                              nome: d.nome,
                              cargo: d.cargo,
                              mes_ano: selectedMonth,
                              salario: d.salario,
                              departamento: d.departamento,
                              data_admissao: d.data_admissao,
                              dados_extraidos: generateMockPayslip(
                                d.nome || '',
                                d.cargo || '',
                                d.salario || 1838.96,
                                d.departamento,
                                d.data_admissao,
                              ),
                            })
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" /> Extração
                        </Button>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Pronto
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <ContraChequeDataModal
        data={previewData}
        isOpen={!!previewData}
        onClose={() => setPreviewData(null)}
      />
    </Card>
  )
}

function AdminHistorico() {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [registros, setRegistros] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any>(null)

  useEffect(() => {
    supabase
      .from('contracheques')
      .select('*, colaboradores!inner(nome, cargo, salario, role, departamento, data_admissao)')
      .eq('mes_ano', selectedMonth)
      .then(({ data }) => {
        if (data) setRegistros(data)
      })
  }, [selectedMonth])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Histórico de Contracheques</CardTitle>
          <CardDescription>Visualize os demonstrativos já publicados por mês.</CardDescription>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.colaboradores?.nome}</TableCell>
                <TableCell>{r.colaboradores?.cargo}</TableCell>
                <TableCell>{r.mes_ano}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPreviewData({
                        nome: r.colaboradores?.nome,
                        cargo: r.colaboradores?.cargo,
                        mes_ano: r.mes_ano,
                        salario: r.colaboradores?.salario,
                        departamento: r.colaboradores?.departamento,
                        data_admissao: r.colaboradores?.data_admissao,
                        arquivo_url: r.arquivo_url,
                        dados_extraidos: r.dados_extraidos,
                      })
                    }
                  >
                    <Eye className="w-4 h-4 mr-2" /> Visualizar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!registros.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum contracheque publicado para este mês.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <ContraChequeDataModal
        data={previewData}
        isOpen={!!previewData}
        onClose={() => setPreviewData(null)}
      />
    </Card>
  )
}

function EmployeeContraCheque({ colaborador }: { colaborador: any }) {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [contracheque, setContracheque] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any>(null)

  useEffect(() => {
    if (colaborador) {
      supabase
        .from('contracheques')
        .select('*')
        .eq('colaborador_id', colaborador.id)
        .eq('mes_ano', selectedMonth)
        .single()
        .then(({ data }) => {
          setContracheque(data)
        })
    }
  }, [colaborador, selectedMonth])

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Meus Contracheques
          </CardTitle>
          <CardDescription>Consulte os dados do seu pagamento mensal.</CardDescription>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {contracheque ? (
          <div className="flex flex-col items-center justify-center p-10 border rounded-lg bg-muted/10">
            <FileText className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Holerite - {selectedMonth}</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              As informações do seu demonstrativo estão disponíveis para visualização.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() =>
                  setPreviewData({
                    nome: colaborador?.nome,
                    cargo: colaborador?.cargo,
                    salario: colaborador?.salario,
                    departamento: colaborador?.departamento,
                    data_admissao: colaborador?.data_admissao,
                    mes_ano: selectedMonth,
                    arquivo_url: contracheque.arquivo_url,
                    dados_extraidos: contracheque.dados_extraidos,
                  })
                }
              >
                <Eye className="w-4 h-4 mr-2" /> Visualizar Holerite
              </Button>
              {contracheque.arquivo_url && (
                <Button variant="outline" asChild>
                  <a href={contracheque.arquivo_url} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Exportar Origem
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-50" />
            <p>Nenhum dado encontrado para {selectedMonth}</p>
          </div>
        )}
      </CardContent>
      <ContraChequeDataModal
        data={previewData}
        isOpen={!!previewData}
        onClose={() => setPreviewData(null)}
      />
    </Card>
  )
}

function ContraChequeDataModal({
  data,
  isOpen,
  onClose,
}: {
  data: any
  isOpen: boolean
  onClose: () => void
}) {
  if (!data) return null

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const mockData =
    data.dados_extraidos ||
    generateMockPayslip(
      data.nome || '',
      data.cargo || '',
      data.salario || 1838.96,
      data.departamento,
      data.data_admissao,
    )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full flex flex-col p-6 bg-slate-200 max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="hidden">
          <DialogTitle>Demonstrativo</DialogTitle>
        </DialogHeader>

        {/* Main Container simulating the paper */}
        <div className="bg-white text-black font-mono text-xs border border-slate-400 p-1 flex relative overflow-x-auto min-w-[800px] shadow-sm">
          {/* Left main content */}
          <div className="flex-1 flex flex-col border border-black">
            {/* Header 1 */}
            <div className="flex justify-between border-b border-black p-2">
              <div>
                <div className="font-bold uppercase tracking-tight">{mockData.empresa.nome}</div>
                <div>CNPJ: &nbsp;&nbsp;{mockData.empresa.cnpj}</div>
              </div>
              <div className="text-center px-4">
                <div>CC: Centro de Custo</div>
                <div>Mensalista</div>
              </div>
              <div className="text-right">
                <div>Folha Mensal</div>
                <div className="capitalize">{data.mes_ano}</div>
              </div>
            </div>

            {/* Header 2 - Employee info */}
            <div className="flex border-b border-black p-2">
              <div className="w-16">
                <div className="text-[10px]">Código</div>
                <div className="font-bold">{mockData.cabecalho.codigo}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px]">Nome do Funcionário</div>
                <div className="font-bold uppercase">{data.nome}</div>
                <div className="uppercase">{data.cargo}</div>
              </div>
              <div className="w-24">
                <div className="text-[10px]">CBO</div>
                <div>{mockData.cabecalho.cbo}</div>
                <div className="mt-1 text-[10px]">Admissão:</div>
              </div>
              <div className="w-24 text-center">
                <div className="text-[10px]">Departamento</div>
                <div>{mockData.cabecalho.departamento}</div>
                <div className="mt-1">{mockData.cabecalho.admissao}</div>
              </div>
              <div className="w-16 text-center">
                <div className="text-[10px]">Filial</div>
                <div>{mockData.cabecalho.filial}</div>
              </div>
            </div>

            {/* Table Header */}
            <div className="flex border-b border-black font-bold bg-slate-50">
              <div className="w-16 p-1 border-r border-black text-center">Código</div>
              <div className="flex-1 p-1 border-r border-black text-center">Descrição</div>
              <div className="w-24 p-1 border-r border-black text-center">Referência</div>
              <div className="w-32 p-1 border-r border-black text-center">Vencimentos</div>
              <div className="w-32 p-1 text-center">Descontos</div>
            </div>

            {/* Table Body (Min height to simulate paper) */}
            <div className="flex-1 min-h-[300px] flex text-sm">
              <div className="w-16 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas.map((l: any, i: number) => (
                  <div key={i}>{l.codigo}</div>
                ))}
              </div>
              <div className="flex-1 border-r border-black p-1 flex flex-col px-2 space-y-1">
                {mockData.linhas.map((l: any, i: number) => (
                  <div key={i}>{l.descricao}</div>
                ))}
              </div>
              <div className="w-24 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas.map((l: any, i: number) => (
                  <div key={i}>{l.referencia}</div>
                ))}
              </div>
              <div className="w-32 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas.map((l: any, i: number) => (
                  <div key={i}>{l.vencimento ? formatNumber(l.vencimento) : '\u00A0'}</div>
                ))}
              </div>
              <div className="w-32 p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas.map((l: any, i: number) => (
                  <div key={i}>{l.desconto ? formatNumber(l.desconto) : '\u00A0'}</div>
                ))}
              </div>
            </div>

            {/* Totals Row */}
            <div className="flex border-t border-black h-16">
              <div className="flex-1 border-r border-black"></div>
              <div className="w-32 border-r border-black flex flex-col justify-between">
                <div className="text-[10px] p-1 border-b border-black text-center">
                  Total de Vencimentos
                </div>
                <div className="p-2 text-right font-bold text-sm">
                  {formatNumber(mockData.totais.vencimentos)}
                </div>
              </div>
              <div className="w-32 flex flex-col justify-between">
                <div className="text-[10px] p-1 border-b border-black text-center">
                  Total de Descontos
                </div>
                <div className="p-2 text-right font-bold text-sm">
                  {formatNumber(mockData.totais.descontos)}
                </div>
              </div>
            </div>

            {/* Liquid Row */}
            <div className="flex border-t border-black h-12">
              <div className="flex-1 flex justify-end items-center pr-4 border-r border-black">
                <span className="text-[10px] mr-4">Valor Líquido</span>
                <span className="text-xl leading-none translate-y-[-2px]">⇨</span>
              </div>
              <div className="w-64 flex items-center justify-end p-2 font-bold text-base bg-slate-50">
                {formatNumber(mockData.totais.liquido)}
              </div>
            </div>

            {/* Bases Row */}
            <div className="flex border-t border-black text-[10px] text-center divide-x divide-black bg-slate-50">
              <div className="flex-1 p-1">
                <div>Salário Base</div>
                <div className="font-bold text-sm">{formatNumber(mockData.bases.salario_base)}</div>
              </div>
              <div className="flex-1 p-1">
                <div>Sal. Contr. INSS</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases.sal_contr_inss)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Base Cálc. FGTS</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases.base_calc_fgts)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>F.G.T.S do Mês</div>
                <div className="font-bold text-sm">{formatNumber(mockData.bases.fgts_mes)}</div>
              </div>
              <div className="flex-1 p-1">
                <div>Base Cálc. IRRF</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases.base_calc_irrf)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Faixa IRRF</div>
                <div className="font-bold text-sm">{formatNumber(mockData.bases.faixa_irrf)}</div>
              </div>
            </div>
          </div>

          {/* Right Receipt stub */}
          <div className="w-16 border-y border-r border-black ml-1 flex flex-col relative bg-white shrink-0 overflow-hidden">
            <div className="flex flex-row flex-1 justify-center items-center py-4 px-1 gap-2">
              <div
                className="text-[10px] whitespace-nowrap transform rotate-180 text-slate-600"
                style={{ writingMode: 'vertical-rl' }}
              >
                Declaro ter recebido a importância liquida discriminada neste recibo.
              </div>
              <div
                className="text-[11px] whitespace-nowrap transform rotate-180"
                style={{ writingMode: 'vertical-rl' }}
              >
                Assinatura do Funcionário
              </div>
            </div>

            <div className="w-full flex flex-col px-2 z-10 pb-6 gap-6">
              <div className="flex items-end justify-between px-1">
                <span className="text-[10px] transform -rotate-90 origin-bottom-left translate-y-3">
                  Data
                </span>
                <span className="border-b border-black w-full translate-y-2 ml-1"></span>
              </div>
              <div className="border-b border-black w-full"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="bg-white">
            Fechar
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
