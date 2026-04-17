import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  TableFooter,
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
  Search,
  Table as TableIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

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

      {isAdmin ? <AdminTabs /> : <EmployeeContraCheque colaborador={colaborador} />}
    </div>
  )
}

function AdminTabs() {
  const [activeTab, setActiveTab] = useState('memoria')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="memoria">Memória de Cálculo</TabsTrigger>
        <TabsTrigger value="upload">Importar Excel</TabsTrigger>
      </TabsList>
      <TabsContent value="memoria">
        <AdminMemoriaCalculo />
      </TabsContent>
      <TabsContent value="upload">
        <AdminUpload onPublishSuccess={() => setActiveTab('memoria')} />
      </TabsContent>
    </Tabs>
  )
}

function AdminMemoriaCalculo() {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewData, setPreviewData] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('contracheques')
      .select('*, colaboradores!inner(nome, cargo, salario, role, departamento, data_admissao)')
      .eq('mes_ano', selectedMonth)
      .then(({ data }) => {
        if (data) {
          const validRecords = data.filter((r) => {
            const colab = r.colaboradores
            if (!colab) return false
            const role = (colab.role || '').toLowerCase()
            const isAdmin = role === 'admin' || role === 'gerente'
            const isRodrigo = (colab.nome || '').toLowerCase().includes('rodrigo')
            if (isAdmin && !isRodrigo) return false
            return true
          })
          setRegistros(validRecords)
        }
        setLoading(false)
      })
  }, [selectedMonth])

  let totalVencimentos = 0
  let totalDescontos = 0
  let totalLiquido = 0

  const eventos: Record<string, { descricao: string; provento: number; desconto: number }> = {}

  registros.forEach((r) => {
    const ext = r.dados_extraidos
    if (ext?.totais) {
      totalVencimentos += ext.totais.vencimentos || 0
      totalDescontos += ext.totais.descontos || 0
      totalLiquido += ext.totais.liquido || 0
    } else if (r.valor_liquido) {
      totalLiquido += r.valor_liquido
    }

    if (ext?.linhas) {
      ext.linhas.forEach((linha: any) => {
        if (!linha.codigo && !linha.descricao) return
        const key = linha.codigo || linha.descricao
        if (!eventos[key]) {
          eventos[key] = {
            descricao: linha.descricao || `Cód. ${linha.codigo}`,
            provento: 0,
            desconto: 0,
          }
        }
        eventos[key].provento += linha.vencimento || 0
        eventos[key].desconto += linha.desconto || 0
      })
    }
  })

  const COLORS_PROVENTOS = ['#10b981', '#059669', '#34d399', '#047857', '#6ee7b7']
  const COLORS_DESCONTOS = ['#ef4444', '#dc2626', '#f87171', '#b91c1c', '#fca5a5']

  const topDescontos = Object.values(eventos)
    .filter((e) => e.desconto > 0)
    .sort((a, b) => b.desconto - a.desconto)
    .slice(0, 5)
    .map((e, index) => ({
      ...e,
      desconto: Number(e.desconto.toFixed(2)),
      fill: COLORS_DESCONTOS[index % COLORS_DESCONTOS.length],
    }))

  const topProventos = Object.values(eventos)
    .filter((e) => e.provento > 0)
    .sort((a, b) => b.provento - a.provento)
    .slice(0, 5)
    .map((e, index) => ({
      ...e,
      provento: Number(e.provento.toFixed(2)),
      fill: COLORS_PROVENTOS[index % COLORS_PROVENTOS.length],
    }))

  const distData = [
    { name: 'Líquido', valor: Number(totalLiquido.toFixed(2)), fill: '#3b82f6' },
    { name: 'Descontos', valor: Number(totalDescontos.toFixed(2)), fill: '#ef4444' },
  ]

  const chartConfig = {
    valor: { label: 'Valor', color: 'hsl(var(--primary))' },
    provento: { label: 'Provento', color: '#10b981' },
    desconto: { label: 'Desconto', color: '#ef4444' },
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Memória de Cálculo da Folha</CardTitle>
          <CardDescription>
            Análise descritiva dos proventos, descontos e líquidos pagos na competência.
          </CardDescription>
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
      <CardContent className="space-y-8">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            Nenhuma memória de cálculo gerada para {selectedMonth}.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-50/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Composição da Folha Bruta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-4">{formatCurrency(totalVencimentos)}</div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="valor"
                        >
                          {distData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Líquido
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Descontos
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50/50 shadow-sm col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Maiores Proventos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <BarChart
                        data={topProventos}
                        layout="vertical"
                        margin={{ left: 0, right: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="descricao"
                          type="category"
                          width={120}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) =>
                            val.substring(0, 15) + (val.length > 15 ? '...' : '')
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Bar dataKey="provento" radius={[0, 4, 4, 0]}>
                          {topProventos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </div>
                <div>
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Maiores Descontos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                      <BarChart
                        data={topDescontos}
                        layout="vertical"
                        margin={{ left: 0, right: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="descricao"
                          type="category"
                          width={120}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) =>
                            val.substring(0, 15) + (val.length > 15 ? '...' : '')
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Bar dataKey="desconto" radius={[0, 4, 4, 0]}>
                          {topDescontos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Descritivo por Funcionário
              </h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Proventos</TableHead>
                      <TableHead className="text-right">Descontos</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.map((r) => {
                      const ext = r.dados_extraidos
                      const prov = ext?.totais?.vencimentos || 0
                      const desc = ext?.totais?.descontos || 0
                      const liq = ext?.totais?.liquido || r.valor_liquido || 0

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.colaboradores?.nome}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {r.colaboradores?.cargo}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(prov)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {formatCurrency(desc)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(liq)}
                          </TableCell>
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
                              <Eye className="w-4 h-4 mr-2" /> Demonstrativo
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Totalizadores
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-bold">
                        {formatCurrency(totalVencimentos)}
                      </TableCell>
                      <TableCell className="text-right text-red-700 font-bold">
                        {formatCurrency(totalDescontos)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(totalLiquido)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          </>
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

function AdminUpload({ onPublishSuccess }: { onPublishSuccess?: () => void }) {
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
        toast.error('Erro no upload: ' + uploadError.message)
        setProcessing(false)
        return
      }

      const { data: urlData } = supabase.storage.from('contracheques').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      let parsedData: any = null

      const formData = new FormData()
      formData.append('file', file)

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('parse-excel', {
        body: formData,
      })

      if (!edgeError && edgeData?.success && Object.keys(edgeData.data).length > 0) {
        parsedData = edgeData.data
      } else {
        throw new Error(
          edgeData?.error || edgeError?.message || 'Falha ao analisar o arquivo na nuvem.',
        )
      }

      const { data: allColabs } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, salario, departamento, data_admissao, role')
        .or('status.eq.Ativo,status.is.null')

      if (!allColabs) throw new Error('Erro ao buscar colaboradores no sistema')

      // Ignorar administradores/gerentes, exceto o Rodrigo
      const colabs = allColabs.filter((c) => {
        const role = (c.role || '').toLowerCase()
        const isAdmin = role === 'admin' || role === 'gerente'
        const isRodrigo = (c.nome || '').toLowerCase().includes('rodrigo')
        if (isAdmin && !isRodrigo) return false
        return true
      })

      const sheetNames = Object.keys(parsedData)
      const finalExtracted: any[] = []

      const getEmptyHolerite = () => ({
        empresa: { nome: '', cnpj: '' },
        cabecalho: {
          codigo: '',
          nome_impresso: '',
          cbo: '',
          departamento: '',
          filial: '',
          admissao: '',
        },
        linhas: [],
        totais: { vencimentos: 0, descontos: 0, liquido: 0 },
        bases: {
          salario_base: 0,
          sal_contr_inss: 0,
          base_calc_fgts: 0,
          fgts_mes: 0,
          base_calc_irrf: 0,
          faixa_irrf: 0,
        },
      })

      const safeParseFloat = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        let strVal = String(val).trim()
        strVal = strVal.replace(/R\$\s*/gi, '').replace(/\s/g, '')
        if (strVal.includes('.') && strVal.includes(',')) {
          strVal = strVal.replace(/\./g, '').replace(',', '.')
        } else if (strVal.includes(',')) {
          strVal = strVal.replace(',', '.')
        }
        const parsed = parseFloat(strVal)
        return isNaN(parsed) ? 0 : parsed
      }

      const isNumeric = (str: string) =>
        /^[-]?\d+([.,]\d+)?$/.test(str.replace(/R\$\s*/gi, '').trim())
      const extractNumbers = (arr: any[]) =>
        arr
          .map((c) => String(c || '').trim())
          .filter((c) => isNumeric(c))
          .map((c) => safeParseFloat(c))

      for (const sheetName of sheetNames) {
        let rawRows: any[] = parsedData[sheetName] || []
        if (rawRows.length === 0) continue

        if (rawRows.length > 0 && !Array.isArray(rawRows[0])) {
          const keys = Object.keys(rawRows[0])
          rawRows = [keys, ...rawRows.map((r) => keys.map((k) => r[k]))]
        }

        let h = getEmptyHolerite()

        const expandedRows: string[][] = []
        for (const row of rawRows) {
          if (!row) continue
          const rowArr = Array.isArray(row) ? row : Object.values(row)
          const cells = rowArr.map((c: any) => String(c || '').trim())
          let maxLines = 1
          const splitCells = cells.map((c) => {
            const lines = c.split(/\r?\n/).map((l) => l.trim())
            if (lines.length > maxLines) maxLines = lines.length
            return lines
          })
          for (let i = 0; i < maxLines; i++) {
            const newRow = splitCells.map((lines) => lines[i] || '')
            if (newRow.some((c) => c !== '')) {
              expandedRows.push(newRow)
            }
          }
        }

        let state = 'HEADER'
        let colMap = { codigo: -1, descricao: -1, referencia: -1, vencimentos: -1, descontos: -1 }

        for (let i = 0; i < expandedRows.length; i++) {
          const row = expandedRows[i]
          const rowTextUpper = row.join(' ').toUpperCase()

          if (!rowTextUpper.trim()) continue

          if (state === 'HEADER') {
            if (rowTextUpper.includes('CNPJ:')) {
              const match = rowTextUpper.match(/CNPJ:\s*([\d./-]+)/)
              if (match) h.empresa.cnpj = match[1]
              const empNameRow = expandedRows[Math.max(0, i - 1)].concat(row)
              const longest = empNameRow.reduce((a, b) => (a.length > b.length ? a : b), '')
              if (longest.length > 10 && !longest.includes('CNPJ')) h.empresa.nome = longest.trim()
            }

            if (rowTextUpper.includes('ADMISSÃO') || rowTextUpper.includes('ADMISSAO')) {
              const dateMatch = rowTextUpper.match(
                /(?:ADMISSÃO|ADMISSAO)[\s:]*([\d]{2}\/[\d]{2}\/[\d]{4})/,
              )
              if (dateMatch) {
                h.cabecalho.admissao = dateMatch[1]
              } else {
                for (const c of row) {
                  const m = c.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/)
                  if (m) h.cabecalho.admissao = m[1]
                }
                if (!h.cabecalho.admissao && i + 1 < expandedRows.length) {
                  for (const c of expandedRows[i + 1]) {
                    const m = c.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/)
                    if (m) h.cabecalho.admissao = m[1]
                  }
                }
              }
            }

            const nomeIdx = row.findIndex(
              (c) => c.toUpperCase().includes('NOME DO FUNCION') || c.toUpperCase() === 'NOME',
            )
            const codIdx = row.findIndex(
              (c) => c.toUpperCase() === 'CÓDIGO' || c.toUpperCase() === 'CODIGO',
            )

            if (nomeIdx !== -1) {
              let foundValues = false
              if (
                row.length > nomeIdx + 1 &&
                row[nomeIdx + 1] &&
                !row[nomeIdx + 1].toUpperCase().includes('CBO')
              ) {
                h.cabecalho.nome_impresso = row[nomeIdx + 1].trim()
                if (codIdx !== -1 && row.length > codIdx + 1)
                  h.cabecalho.codigo = row[codIdx + 1].trim()
                foundValues = true
              }
              if (!foundValues) {
                for (let j = i + 1; j <= i + 3 && j < expandedRows.length; j++) {
                  const nextRow = expandedRows[j]
                  if (nextRow[nomeIdx]) {
                    h.cabecalho.nome_impresso = nextRow[nomeIdx].trim()
                    if (codIdx !== -1 && nextRow[codIdx])
                      h.cabecalho.codigo = nextRow[codIdx].trim()
                    break
                  }
                }
              }
            }

            if (!h.cabecalho.nome_impresso) {
              for (const c of row) {
                const m = c.match(/^(\d+)\s*[-|–]\s*([A-ZÀ-Ú\s]{5,})$/i)
                if (m && !c.toUpperCase().includes('CBO') && !c.toUpperCase().includes('CNPJ')) {
                  h.cabecalho.codigo = m[1]
                  h.cabecalho.nome_impresso = m[2].trim()
                }
              }
            }

            if (rowTextUpper.includes('DESCRIÇÃO') || rowTextUpper.includes('DESCRICAO')) {
              colMap.codigo = row.findIndex(
                (c) => c.toUpperCase().includes('CÓDIGO') || c.toUpperCase().includes('CODIGO'),
              )
              colMap.descricao = row.findIndex(
                (c) =>
                  c.toUpperCase().includes('DESCRIÇÃO') || c.toUpperCase().includes('DESCRICAO'),
              )
              colMap.referencia = row.findIndex(
                (c) =>
                  c.toUpperCase().includes('REFERÊNCIA') || c.toUpperCase().includes('REFERENCIA'),
              )
              colMap.vencimentos = row.findIndex(
                (c) =>
                  c.toUpperCase().includes('VENCIMENTO') || c.toUpperCase().includes('PROVENTO'),
              )
              colMap.descontos = row.findIndex(
                (c) =>
                  c.toUpperCase().includes('DESCONTO') && !c.toUpperCase().includes('DESCRIÇÃO'),
              )

              if (colMap.codigo === -1) colMap.codigo = 0
              if (colMap.descricao === -1) colMap.descricao = 1
              if (colMap.referencia === -1) colMap.referencia = 2
              if (colMap.vencimentos === -1) colMap.vencimentos = 3
              if (colMap.descontos === -1) colMap.descontos = 4

              state = 'EVENTS'
              continue
            }
          } else if (state === 'EVENTS') {
            if (
              rowTextUpper.includes('TOTAL DE VENCIMENTOS') ||
              rowTextUpper.includes('TOTAL DE DESCONTOS') ||
              rowTextUpper.includes('VALOR LÍQUIDO') ||
              rowTextUpper.includes('SALÁRIO BASE') ||
              rowTextUpper.includes('TOTAIS') ||
              (rowTextUpper.includes('TOTAL') &&
                !rowTextUpper.includes('VENCIMENTOS') &&
                !rowTextUpper.includes('DESCONTOS'))
            ) {
              state = 'FOOTER'
              i--
              continue
            }

            let cod = colMap.codigo >= 0 ? row[colMap.codigo] : ''
            let desc = colMap.descricao >= 0 ? row[colMap.descricao] : ''
            let ref = colMap.referencia >= 0 ? row[colMap.referencia] : ''
            let venc = colMap.vencimentos >= 0 ? row[colMap.vencimentos] : ''
            let descVal = colMap.descontos >= 0 ? row[colMap.descontos] : ''

            if (!cod && desc) {
              const m = desc.match(/^(\d+)\s+(.+)$/)
              if (m) {
                cod = m[1]
                desc = m[2].trim()
              }
            }

            if (cod || desc || venc || descVal) {
              if (
                cod.replace(/[-_]/g, '').trim() === '' &&
                desc.replace(/[-_]/g, '').trim() === ''
              ) {
                continue
              }

              h.linhas.push({
                codigo: cod || '',
                descricao: desc || '',
                referencia: ref || '',
                vencimento: safeParseFloat(venc),
                desconto: safeParseFloat(descVal),
              })
            }
          } else if (state === 'FOOTER') {
            if (rowTextUpper.includes('VALOR LÍQUIDO') || rowTextUpper.includes('LIQUIDO')) {
              const match = rowTextUpper.match(/L[ÍI]QUIDO.*?R?\$?\s*([-]?[\d.,]+)/i)
              if (match) {
                h.totais.liquido = safeParseFloat(match[1])
              } else {
                const nums = extractNumbers(row)
                if (nums.length > 0) h.totais.liquido = nums[nums.length - 1]
              }
            }

            if (
              rowTextUpper.includes('SALÁRIO BASE') ||
              rowTextUpper.includes('SAL. CONTR. INSS')
            ) {
              if (i + 1 < expandedRows.length) {
                const baseHeaders = row.map((c) => c.toUpperCase())
                const baseVals = expandedRows[i + 1]
                let foundBases = false
                for (let j = 0; j < baseHeaders.length; j++) {
                  if (baseHeaders[j].includes('SALÁRIO BASE')) {
                    h.bases.salario_base = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                  if (baseHeaders[j].includes('SAL. CONTR. INSS')) {
                    h.bases.sal_contr_inss = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                  if (baseHeaders[j].includes('BASE CÁLC. FGTS')) {
                    h.bases.base_calc_fgts = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                  if (baseHeaders[j].includes('F.G.T.S DO MÊS')) {
                    h.bases.fgts_mes = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                  if (baseHeaders[j].includes('BASE CÁLC. IRRF')) {
                    h.bases.base_calc_irrf = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                  if (baseHeaders[j].includes('FAIXA IRRF')) {
                    h.bases.faixa_irrf = safeParseFloat(baseVals[j])
                    foundBases = true
                  }
                }
                if (!foundBases) {
                  const nums = extractNumbers(expandedRows[i + 1])
                  if (nums.length >= 6) {
                    h.bases.salario_base = nums[0]
                    h.bases.sal_contr_inss = nums[1]
                    h.bases.base_calc_fgts = nums[2]
                    h.bases.fgts_mes = nums[3]
                    h.bases.base_calc_irrf = nums[4]
                    h.bases.faixa_irrf = nums[5]
                  }
                }
              }
            }
          }
        }

        h.totais.vencimentos = h.linhas.reduce(
          (acc: number, l: any) => acc + (l.vencimento || 0),
          0,
        )
        h.totais.descontos = h.linhas.reduce((acc: number, l: any) => acc + (l.desconto || 0), 0)

        if (!h.totais.liquido && h.totais.vencimentos > 0) {
          h.totais.liquido = h.totais.vencimentos - h.totais.descontos
        }

        if (
          !h.cabecalho.nome_impresso &&
          sheetName.length > 3 &&
          sheetName.toUpperCase() !== 'SHEET1' &&
          sheetName.toUpperCase() !== 'PLAN1'
        ) {
          h.cabecalho.nome_impresso = sheetName
        }

        if (h.cabecalho.nome_impresso) {
          const dashMatch = h.cabecalho.nome_impresso.match(/^(\d+)\s*[-|–]\s*(.+)$/)
          const nameMatch = h.cabecalho.nome_impresso.match(/^(\d+)\s+(.+)$/)
          if (dashMatch) {
            if (!h.cabecalho.codigo || h.cabecalho.codigo === '00') {
              h.cabecalho.codigo = dashMatch[1]
            }
            h.cabecalho.nome_impresso = dashMatch[2].trim()
          } else if (nameMatch) {
            if (!h.cabecalho.codigo || h.cabecalho.codigo === '00') {
              h.cabecalho.codigo = nameMatch[1]
            }
            h.cabecalho.nome_impresso = nameMatch[2].trim()
          }
        }

        if (h.cabecalho.nome_impresso || h.linhas.length > 0) {
          finalExtracted.push(h)
        }
      }

      const extracted = []
      const mappedColabIds = new Set()

      for (const empData of finalExtracted) {
        const empName = (empData.cabecalho.nome_impresso || '').trim()
        const empCode = (empData.cabecalho.codigo || '').trim()

        let colab = null

        // 0. Primary strict code match
        if (empCode && empCode !== '00') {
          colab = colabs.find((c) => !mappedColabIds.has(c.id) && c.codigo_funcionario === empCode)
        }

        if (!colab && empName) {
          const normEmpName = empName.toUpperCase().replace(/\s+/g, ' ').trim()

          // 1. Exact name match
          colab = colabs.find(
            (c) => !mappedColabIds.has(c.id) && (c.nome || '').toUpperCase().trim() === normEmpName,
          )

          // 2. Fallback Code match
          if (!colab && empCode && empCode !== '00') {
            colab = colabs.find(
              (c) =>
                !mappedColabIds.has(c.id) &&
                (String(c.id).includes(empCode) ||
                  String(c.cpf).includes(empCode) ||
                  String(c.rg).includes(empCode)),
            )
          }

          // 3. Includes & Token Match (Robustez para nomes parciais como Lucas)
          if (!colab) {
            colab = colabs.find((c) => {
              if (mappedColabIds.has(c.id)) return false
              const normColabName = (c.nome || '').toUpperCase().replace(/\s+/g, ' ').trim()

              if (normEmpName.length > 3 && normColabName.length > 3) {
                if (normColabName.includes(normEmpName) || normEmpName.includes(normColabName)) {
                  return true
                }
              }

              const empTokens = normEmpName.split(' ').filter((t) => t.length > 2)
              const colabTokens = normColabName.split(' ').filter((t) => t.length > 2)

              if (empTokens.length > 0 && colabTokens.length > 0) {
                const matchCount = empTokens.filter((t) => colabTokens.includes(t)).length

                if (
                  empTokens[0] === colabTokens[0] &&
                  (matchCount >= 2 || (empTokens.length === 1 && colabTokens.length === 1))
                ) {
                  return true
                }

                if (matchCount >= 2) {
                  return true
                }
              }

              return false
            })
          }
        }

        let has_error = false
        let error_msg = ''

        if (colab) {
          if (
            colab.codigo_funcionario &&
            empCode &&
            empCode !== '00' &&
            colab.codigo_funcionario !== empCode
          ) {
            has_error = true
            error_msg = `Código divergente: Planilha (${empCode}) vs Sistema (${colab.codigo_funcionario}). Resolva para importar.`
          }
          mappedColabIds.add(colab.id)
        }

        const dados_extraidos = {
          empresa: {
            nome: empData.empresa.nome || 'SERVICELOGIC.COM SOLUCOES EM TECNOLOGIA LTDA',
            cnpj: empData.empresa.cnpj || '10.929.600/0001-92',
          },
          cabecalho: {
            codigo: empCode || '00',
            cbo: empData.cabecalho.cbo || '212420',
            nome_impresso: empName || 'FUNCIONÁRIO NÃO IDENTIFICADO',
            departamento: colab?.departamento || empData.cabecalho.departamento || '1',
            filial: empData.cabecalho.filial || '1',
            admissao:
              empData.cabecalho.admissao ||
              (colab?.data_admissao
                ? new Date(colab.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR')
                : ''),
          },
          linhas: empData.linhas,
          totais: empData.totais,
          bases: empData.bases,
        }

        extracted.push({
          colaborador_id: colab?.id || `unmapped-${Math.random()}`,
          nome: empName,
          cargo: colab?.cargo || '',
          salario: colab?.salario || 0,
          departamento: colab?.departamento || '',
          data_admissao: colab?.data_admissao || '',
          arquivo_url: publicUrl,
          dados_extraidos,
          valor_liquido: empData.totais.liquido,
          valor_bruto: empData.totais.vencimentos,
          is_mapped: !!colab,
          has_error,
          error_msg,
        })
      }

      if (extracted.length === 0) {
        toast.error(
          'Nenhum dado válido extraído. Verifique o formato das colunas do arquivo Excel.',
        )
      } else {
        setExtractedData(extracted)
        toast.success('Planilha processada com sucesso! Prévia carregada.')

        // Auto-open preview for the first mapped item to give immediate feedback
        const firstMapped = extracted.find((e) => e.is_mapped) || extracted[0]
        if (firstMapped) {
          setTimeout(() => {
            setPreviewData({ ...firstMapped, mes_ano: selectedMonth })
          }, 500)
        }
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao processar o arquivo: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const publish = async () => {
    const errorCount = extractedData.filter((e) => e.has_error).length
    if (errorCount > 0) {
      toast.error(
        'Não é possível publicar: Há divergências de código de funcionário. Corrija o cadastro ou a planilha.',
      )
      return
    }

    const validData = extractedData.filter((e) => e.is_mapped !== false && !e.has_error)
    if (!validData.length) {
      toast.error('Nenhum colaborador válido mapeado para publicar.')
      return
    }

    setPublishing(true)
    try {
      const insertsMap = new Map()
      validData.forEach((e) => {
        if (!insertsMap.has(e.colaborador_id)) {
          insertsMap.set(e.colaborador_id, {
            colaborador_id: e.colaborador_id,
            mes_ano: selectedMonth,
            arquivo_url: e.arquivo_url,
            valor_liquido: e.valor_liquido,
            dados_extraidos: e.dados_extraidos,
          })
        }
      })
      const inserts = Array.from(insertsMap.values())

      // Processar em lotes para evitar problemas de limite de requisição e timeout
      const batchSize = 50
      for (let i = 0; i < inserts.length; i += batchSize) {
        const batch = inserts.slice(i, i + batchSize)
        const { error } = await supabase
          .from('contracheques')
          .upsert(batch as any, { onConflict: 'colaborador_id, mes_ano' })

        if (error) throw error
      }

      const unmappedCount = extractedData.length - validData.length
      toast.success(
        `Contracheques publicados com sucesso! ${unmappedCount > 0 ? `(${unmappedCount} ignorados)` : ''}`,
      )
      setExtractedData([])
      setFile(null)
      if (onPublishSuccess) onPublishSuccess()
    } catch (err: any) {
      toast.error('Erro ao publicar: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Arquivo Excel (.xlsx)</CardTitle>
        <CardDescription>
          Faça o upload da planilha Excel. O sistema mapeará os dados linha por linha com fidelidade
          total.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50/50 text-blue-800 text-sm p-4 rounded-lg flex items-start gap-3 border border-blue-100">
          <div className="mt-0.5">💡</div>
          <div>
            <strong>Leitura Fiel e Estruturada:</strong> O sistema agora processa planilhas Excel
            (XLSX/XLS). Cada evento listado para o funcionário será importado exatamente como consta
            no arquivo, sem criar valores automáticos ou omitir códigos (ex: 202, 8125, 998).
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
            <TableIcon className="w-12 h-12 text-green-600 mb-4" />
            <p className="text-lg font-medium mb-1">Arraste a planilha Excel aqui</p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar (.xlsx, .xls)
            </p>
            <Input
              type="file"
              accept=".xlsx, .xls, .csv"
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
                {processing ? 'Analisando Linhas...' : 'Processar Planilha'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-medium">Mapeamento 1:1 Concluído</p>
                  <p className="text-sm opacity-90">
                    {extractedData.length} colaboradores identificados na planilha.
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
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Valor Bruto</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.map((d, i) => (
                    <TableRow
                      key={i}
                      className={
                        d.is_mapped === false || d.has_error ? 'opacity-70 bg-muted/20' : ''
                      }
                    >
                      <TableCell className="font-medium">
                        {d.dados_extraidos?.cabecalho?.codigo &&
                        d.dados_extraidos.cabecalho.codigo !== '00' &&
                        d.dados_extraidos.cabecalho.codigo !== d.nome
                          ? `${d.dados_extraidos.cabecalho.codigo} - `
                          : ''}
                        {d.nome}
                        {d.is_mapped === false && !d.has_error && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            (Não mapeado)
                          </span>
                        )}
                        {d.has_error && (
                          <span className="ml-2 text-xs text-red-600 font-semibold block mt-1">
                            ⚠️ {d.error_msg}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        R${' '}
                        {d.valor_bruto?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.has_error ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Divergência
                          </Badge>
                        ) : d.is_mapped !== false ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Válido
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground border-slate-300"
                          >
                            Não Localizado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewData({ ...d, mes_ano: selectedMonth })}
                          >
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold text-right">Total da Folha:</TableCell>
                    <TableCell className="text-right font-bold text-lg text-blue-700">
                      R${' '}
                      {extractedData
                        .reduce((acc, curr) => acc + (curr.valor_bruto || 0), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
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
        .then(({ data }) => setContracheque(data))
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
    }).format(value || 0)
  }

  const mockData = data.dados_extraidos || {
    empresa: { nome: '', cnpj: '' },
    cabecalho: {},
    linhas: [],
    totais: { vencimentos: 0, descontos: 0, liquido: 0 },
    bases: {},
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full flex flex-col p-6 bg-slate-200 max-h-[90vh] overflow-y-auto shadow-2xl print:block print:p-0 print:bg-white print:shadow-none print:h-auto print:max-h-none print:absolute print:top-0 print:left-0 print:translate-x-0 print:translate-y-0 print:transform-none print:w-full print:max-w-full print:m-0 print:border-none print:overflow-visible print:break-inside-avoid">
        <DialogHeader className="hidden">
          <DialogTitle>Demonstrativo</DialogTitle>
        </DialogHeader>

        <div className="w-full overflow-x-auto print:overflow-visible pb-4">
          <div className="bg-white text-black font-mono text-[11px] border border-slate-400 p-2 flex relative min-w-[700px] w-full max-w-[850px] mx-auto shadow-sm print-area print:min-w-0 print:w-full print:max-w-[180mm] print:border-none print:shadow-none print:overflow-hidden print:p-0 print:m-0 print:mx-auto">
            <div className="flex-1 flex flex-col border border-black box-border">
              <div className="flex justify-between border-b border-black p-2 box-border">
                <div>
                  <div className="font-bold uppercase tracking-tight">
                    {mockData.empresa?.nome || 'SERVICELOGIC.COM SOLUCOES EM TECNOLOGIA LTDA'}
                  </div>
                  <div>CNPJ:&nbsp;&nbsp;{mockData.empresa?.cnpj || '10.929.600/0001-92'}</div>
                </div>
                <div className="text-center px-4">
                  <div>CC: Centro de Custo</div>
                  <div>Mensalista</div>
                </div>
                <div className="text-right">
                  <div>Folha Mensal</div>
                  <div className="capitalize">
                    {(() => {
                      if (!data.mes_ano) return ''
                      const [m, y] = data.mes_ano.split('/')
                      if (m && y) {
                        const date = new Date(parseInt(y), parseInt(m) - 1, 1)
                        return new Intl.DateTimeFormat('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        }).format(date)
                      }
                      return data.mes_ano
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex border-b border-black p-2 box-border">
                <div className="w-[10%]">
                  <div className="text-[10px]">Código</div>
                  <div className="font-bold">{mockData.cabecalho?.codigo || '00'}</div>
                </div>
                <div className="w-[45%] pr-2">
                  <div className="text-[10px]">Nome do Funcionário</div>
                  <div className="font-bold uppercase truncate">
                    {mockData.cabecalho?.nome_impresso || data.nome}
                  </div>
                  <div className="uppercase truncate">{data.cargo || ''}</div>
                </div>
                <div className="w-[15%]">
                  <div className="text-[10px]">CBO</div>
                  <div>{mockData.cabecalho?.cbo || '212420'}</div>
                  <div className="mt-1 text-[10px]">Admissão:</div>
                </div>
                <div className="w-[15%] text-center">
                  <div className="text-[10px]">Departamento</div>
                  <div>{mockData.cabecalho?.departamento || data.departamento || '1'}</div>
                  <div className="mt-1">{mockData.cabecalho?.admissao || '01/01/2023'}</div>
                </div>
                <div className="w-[15%] text-center">
                  <div className="text-[10px]">Filial</div>
                  <div>{mockData.cabecalho?.filial || '1'}</div>
                </div>
              </div>

              <div className="flex border-b border-black font-bold bg-slate-50 print:bg-transparent box-border">
                <div className="w-[10%] p-1 border-r border-black text-center box-border">
                  Código
                </div>
                <div className="w-[45%] p-1 border-r border-black text-center box-border">
                  Descrição
                </div>
                <div className="w-[10%] p-1 border-r border-black text-center box-border">Ref.</div>
                <div className="w-[17.5%] p-1 border-r border-black text-center box-border">
                  Vencimentos
                </div>
                <div className="w-[17.5%] p-1 text-center box-border">Descontos</div>
              </div>

              <div className="flex-1 min-h-[300px] flex text-[13px] print:text-[12px] box-border">
                <div className="w-[10%] border-r border-black p-1 flex flex-col items-center px-1 space-y-1 box-border">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.codigo}
                    </div>
                  ))}
                </div>
                <div className="w-[45%] border-r border-black p-1 flex flex-col px-2 space-y-1 box-border">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem] truncate">
                      {l.descricao}
                    </div>
                  ))}
                </div>
                <div className="w-[10%] border-r border-black p-1 flex flex-col items-center px-1 space-y-1 box-border">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.referencia}
                    </div>
                  ))}
                </div>
                <div className="w-[17.5%] border-r border-black p-1 flex flex-col items-end px-2 space-y-1 box-border">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.vencimento ? formatNumber(l.vencimento) : '\u00A0'}
                    </div>
                  ))}
                </div>
                <div className="w-[17.5%] p-1 flex flex-col items-end px-2 space-y-1 box-border">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.desconto ? formatNumber(l.desconto) : '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex border-t border-black h-16 box-border">
                <div className="w-[65%] border-r border-black box-border"></div>
                <div className="w-[17.5%] border-r border-black flex flex-col justify-between box-border">
                  <div className="text-[10px] p-1 border-b border-black text-center print:bg-transparent bg-slate-50 box-border">
                    Total Vencimentos
                  </div>
                  <div className="p-2 text-right font-bold text-sm">
                    {formatNumber(mockData.totais?.vencimentos || 0)}
                  </div>
                </div>
                <div className="w-[17.5%] flex flex-col justify-between box-border">
                  <div className="text-[10px] p-1 border-b border-black text-center print:bg-transparent bg-slate-50 box-border">
                    Total Descontos
                  </div>
                  <div className="p-2 text-right font-bold text-sm">
                    {formatNumber(mockData.totais?.descontos || 0)}
                  </div>
                </div>
              </div>

              <div className="flex border-t border-black h-12 box-border">
                <div className="w-[65%] flex justify-end items-center pr-4 border-r border-black box-border">
                  <span className="text-[10px] mr-4">Valor Líquido</span>
                  <span className="text-xl leading-none translate-y-[-2px]">⇨</span>
                </div>
                <div className="w-[35%] flex items-center justify-end p-2 font-bold text-[15px] bg-slate-50 print:bg-transparent box-border">
                  {formatNumber(mockData.totais?.liquido || 0)}
                </div>
              </div>

              <div className="flex border-t border-black text-[10px] text-center bg-slate-50 print:bg-transparent box-border">
                <div className="w-[16.66%] p-1 border-r border-black box-border">
                  <div className="truncate">Salário Base</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.salario_base || 0)}
                  </div>
                </div>
                <div className="w-[16.66%] p-1 border-r border-black box-border">
                  <div className="truncate">Sal. Contr. INSS</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.sal_contr_inss || 0)}
                  </div>
                </div>
                <div className="w-[16.66%] p-1 border-r border-black box-border">
                  <div className="truncate">Base Cálc. FGTS</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.base_calc_fgts || 0)}
                  </div>
                </div>
                <div className="w-[16.66%] p-1 border-r border-black box-border">
                  <div className="truncate">F.G.T.S do Mês</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.fgts_mes || 0)}
                  </div>
                </div>
                <div className="w-[16.66%] p-1 border-r border-black box-border">
                  <div className="truncate">Base Cálc. IRRF</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.base_calc_irrf || 0)}
                  </div>
                </div>
                <div className="w-[16.66%] p-1 box-border">
                  <div className="truncate">Faixa IRRF</div>
                  <div className="font-bold text-xs mt-1">
                    {formatNumber(mockData.bases?.faixa_irrf || 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[45px] sm:w-[50px] border-y border-r border-black flex flex-col relative bg-white shrink-0 overflow-hidden box-border">
              <div className="flex flex-row flex-1 justify-center items-center py-4 px-1 gap-1">
                <div
                  className="text-[9px] whitespace-nowrap transform rotate-180 text-slate-600 print:text-black"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Declaro ter recebido a importância liquida discriminada neste recibo.
                </div>
                <div
                  className="text-[10px] whitespace-nowrap transform rotate-180 font-bold"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Assinatura do Funcionário
                </div>
              </div>
              <div className="w-full flex flex-col px-1 z-10 pb-6 gap-6">
                <div className="flex items-end justify-between">
                  <span className="text-[9px] transform -rotate-90 origin-bottom-left translate-y-3">
                    Data
                  </span>
                  <span className="border-b border-black w-full translate-y-2 ml-1"></span>
                </div>
                <div className="border-b border-black w-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 mt-6 print-hidden">
          <Button variant="outline" onClick={onClose} className="bg-white">
            Fechar
          </Button>
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir A4
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
