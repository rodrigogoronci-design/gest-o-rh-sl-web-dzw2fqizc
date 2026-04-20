import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
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
  PenTool,
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
        if (!eventos[key])
          eventos[key] = {
            descricao: linha.descricao || `Cód. ${linha.codigo}`,
            provento: 0,
            desconto: 0,
          }
        eventos[key].provento += linha.vencimento || 0
        eventos[key].desconto += linha.desconto || 0
      })
    }
  })

  const COLORS_PROVENTOS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4']
  const COLORS_DESCONTOS = ['#ef4444', '#ec4899', '#f97316', '#6366f1', '#14b8a6']

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
                    <ChartContainer config={{}} className="h-[220px] w-full">
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
                    <ChartContainer config={{}} className="h-[220px] w-full">
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
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-center">Assinatura</TableHead>
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
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{r.colaboradores?.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.colaboradores?.cargo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {r.assinado ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Assinado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Pendente
                            </Badge>
                          )}
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
                                assinado: r.assinado,
                                data_assinatura: r.data_assinatura,
                                assinatura_nome: r.assinatura_nome,
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
  const [parsingErrorDetails, setParsingErrorDetails] = useState<string[] | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setExtractedData([])
    }
  }

  const processFile = async () => {
    if (!file) return
    setProcessing(true)
    setParsingErrorDetails(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('contracheques')
        .upload(fileName, file)
      if (uploadError) throw new Error('Erro no upload: ' + uploadError.message)

      const { data: urlData } = supabase.storage.from('contracheques').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      const formData = new FormData()
      formData.append('file', file)

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('parse-excel', {
        body: formData,
      })
      let parsedData: any = null
      let rawText: string = ''
      if (!edgeError && edgeData?.success) {
        parsedData = edgeData.data
        rawText = edgeData.rawText || ''
      } else {
        throw new Error(
          edgeData?.error || edgeError?.message || 'Falha ao analisar o arquivo na nuvem.',
        )
      }

      const { data: allColabs } = await supabase
        .from('colaboradores')
        .select(
          'id, nome, cargo, salario, departamento, data_admissao, role, codigo_funcionario, cpf, rg',
        )
        .or('status.eq.Ativo,status.is.null')
      if (!allColabs) throw new Error('Erro ao buscar colaboradores no sistema')

      const colabs = allColabs.filter((c) => {
        const role = (c.role || '').toLowerCase()
        const isAdmin = role === 'admin' || role === 'gerente'
        const isRodrigo = (c.nome || '').toLowerCase().includes('rodrigo')
        if (isAdmin && !isRodrigo) return false
        return true
      })

      let finalExtracted: any[] = []
      const logs: string[] = []
      const sheetNames = parsedData ? Object.keys(parsedData) : []
      logs.push(`Arquivo lido. Abas encontradas: ${sheetNames.join(', ')}`)

      let isDataEmpty =
        !parsedData ||
        sheetNames.length === 0 ||
        Object.values(parsedData).every((arr: any) => arr.length === 0)
      let sheetsToProcess: { name: string; rows: any[][] }[] = []

      if (isDataEmpty && rawText) {
        logs.push(`Abas vazias detectadas. Usando extração de texto bruto (Fallback).`)
        const lines = rawText.split(/\r?\n/)
        const delimiter = rawText.includes(';') ? ';' : rawText.includes('\t') ? '\t' : ','
        const rows = lines.map((line) => line.split(delimiter))
        sheetsToProcess.push({ name: 'Planilha1', rows })
      } else if (parsedData) {
        for (const sheetName of sheetNames) {
          sheetsToProcess.push({ name: sheetName, rows: parsedData[sheetName] })
        }
      }

      const getEmptyHolerite = () => ({
        empresa: { nome: '', cnpj: '' },
        cabecalho: {
          codigo: '',
          nome_impresso: '',
          cargo: '',
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
        if (strVal.includes('.') && strVal.includes(','))
          strVal = strVal.replace(/\./g, '').replace(',', '.')
        else if (strVal.includes(',')) strVal = strVal.replace(',', '.')
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

      for (const sheet of sheetsToProcess) {
        let rawRows: any[] = sheet.rows || []
        logs.push(`Aba '${sheet.name}' tem ${rawRows.length} linhas brutas.`)
        if (rawRows.length === 0) continue

        if (rawRows.length > 0 && !Array.isArray(rawRows[0])) {
          const keys = Object.keys(rawRows[0])
          rawRows = [keys, ...rawRows.map((r) => keys.map((k) => r[k]))]
        }

        const expandedRows: string[][] = []
        for (const row of rawRows) {
          if (!row) continue
          const rowArr = Array.isArray(row) ? row : Object.values(row)
          const cells = rowArr.map((c: any) => String(c || '').trim())
          if (cells.every((c) => c === '')) continue
          let maxLines = 1
          const splitCells = cells.map((c) => {
            const lines = c.split(/\r?\n/).map((l) => l.trim())
            if (lines.length > maxLines) maxLines = lines.length
            return lines
          })
          for (let i = 0; i < maxLines; i++) {
            const newRow = splitCells.map((lines) => lines[i] || '')
            if (newRow.some((c) => c !== '')) expandedRows.push(newRow)
          }
        }
        logs.push(`Aba '${sheet.name}' expandida para ${expandedRows.length} linhas válidas.`)

        let methodExtracted = []
        let h = getEmptyHolerite()
        let inEvents = false
        let colCod = -1,
          colDesc = -1,
          colRef = -1,
          colVenc = -1,
          colDescVal = -1

        for (let i = 0; i < expandedRows.length; i++) {
          const row = expandedRows[i]
          const rowText = row.join(' ').toUpperCase()
          if (!rowText.trim()) continue

          // Detect headers
          if (
            (rowText.includes('CÓDIGO') || rowText.includes('COD')) &&
            (rowText.includes('DESCRIÇÃO') ||
              rowText.includes('DESCRICAO') ||
              rowText.includes('EVENTO')) &&
            !rowText.includes('TOTAL')
          ) {
            colCod = row.findIndex(
              (c) =>
                c.toUpperCase().includes('CÓD') ||
                c.toUpperCase() === 'COD' ||
                c.toUpperCase() === 'COD.',
            )
            colDesc = row.findIndex(
              (c) => c.toUpperCase().includes('DESCRI') || c.toUpperCase().includes('EVENTO'),
            )
            colRef = row.findIndex((c) => c.toUpperCase().includes('REF'))
            colVenc = row.findIndex(
              (c) =>
                c.toUpperCase().includes('VENCIMENTO') ||
                c.toUpperCase().includes('PROVENTO') ||
                c.toUpperCase() === 'VALOR',
            )
            colDescVal = row.findIndex(
              (c) => c.toUpperCase().includes('DESCONTO') && !c.toUpperCase().includes('DESCRI'),
            )

            if (colCod === -1) colCod = 0
            if (colDesc === -1) colDesc = 1
            if (colRef === -1) colRef = 2
            if (colVenc === -1) colVenc = row.length > 3 ? 3 : 2
            if (colDescVal === -1) colDescVal = row.length > 4 ? 4 : 3

            inEvents = true
            logs.push(
              `Cabeçalhos detectados (Linha ${i + 1}) - C:${colCod} D:${colDesc} V:${colVenc} Desc:${colDescVal}`,
            )

            // Look back for employee name if not found
            if (!h.cabecalho.nome_impresso && i > 0) {
              for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const prevRow = expandedRows[j]
                const possibleNameCell = prevRow.find(
                  (c) =>
                    c.length > 5 &&
                    !c.match(/^[0-9.,]+$/) &&
                    !c.toUpperCase().includes('EMPRESA') &&
                    !c.toUpperCase().includes('RECIBO') &&
                    !c.toUpperCase().includes('MENSAL'),
                )
                if (possibleNameCell) {
                  const match = possibleNameCell.match(
                    /(?:^|\s)(\d{1,6})\s*[-|–]?\s*([A-ZÀ-Ÿ\s]{5,})/i,
                  )
                  if (match) {
                    h.cabecalho.codigo = match[1]
                    h.cabecalho.nome_impresso = match[2].trim()
                  } else {
                    h.cabecalho.nome_impresso = possibleNameCell
                  }
                  logs.push(`Colaborador detectado retroativamente: ${h.cabecalho.nome_impresso}`)
                  break
                }
              }
            }
            continue
          }

          // Total row check
          if (
            rowText.includes('TOTAL DE VENCIMENTOS') ||
            rowText.includes('VALOR LÍQUIDO') ||
            (rowText.includes('TOTAL') && rowText.includes('DESCONTOS')) ||
            rowText.includes('LIQUIDO') ||
            rowText.includes('LÍQUIDO') ||
            rowText.includes('SALÁRIO BASE')
          ) {
            inEvents = false

            if (h.cabecalho.nome_impresso && h.linhas.length > 0) {
              const nums = extractNumbers(row)
              if (
                rowText.includes('TOTAL DE VENCIMENTOS') ||
                (rowText.includes('TOTAL') && rowText.includes('VENC'))
              ) {
                if (nums.length >= 2) {
                  h.totais.vencimentos = nums[0]
                  h.totais.descontos = nums[1]
                } else if (nums.length === 1) {
                  h.totais.vencimentos = nums[0]
                }
              }
              if (rowText.includes('TOTAL') && rowText.includes('DESC')) {
                if (nums.length > 0) h.totais.descontos = nums[nums.length - 1]
              }
              if (rowText.includes('LÍQUIDO') || rowText.includes('LIQUIDO')) {
                if (nums.length > 0) h.totais.liquido = nums[nums.length - 1]

                if (h.totais.vencimentos === 0)
                  h.totais.vencimentos = h.linhas.reduce(
                    (acc, l: any) => acc + (l.vencimento || 0),
                    0,
                  )
                if (h.totais.descontos === 0)
                  h.totais.descontos = h.linhas.reduce((acc, l: any) => acc + (l.desconto || 0), 0)
                if (h.totais.liquido === 0)
                  h.totais.liquido = h.totais.vencimentos - h.totais.descontos
                methodExtracted.push({ ...h })
                logs.push(`Holerite fechado para: ${h.cabecalho.nome_impresso}`)
                h = getEmptyHolerite()
                colCod = -1
              }
            }
            continue
          }

          // If not in events, look for employee name going forward
          if (!inEvents && !h.cabecalho.nome_impresso) {
            const possibleNameCell = row.find((c) => {
              if (c.length < 6) return false
              const upper = c.toUpperCase()
              if (
                upper.includes('EMPRESA') ||
                upper.includes('CNPJ') ||
                upper.includes('RECIBO') ||
                upper.includes('FOLHA') ||
                upper.includes('MENSAL')
              )
                return false
              if (c.match(/^[0-9.,]+$/)) return false
              return colabs.some((colab) => upper.includes(colab.nome.toUpperCase().trim()))
            })

            if (possibleNameCell) {
              h.cabecalho.nome_impresso = possibleNameCell
              logs.push(`Colaborador detectado (match exato): ${possibleNameCell}`)
            } else {
              const match = rowText.match(/(?:^|\s)(\d{1,6})\s*[-|–]?\s*([A-ZÀ-Ÿ\s]{6,})/)
              if (match && !match[2].includes('TOTAL') && !match[2].includes('EMPRESA')) {
                h.cabecalho.codigo = match[1]
                h.cabecalho.nome_impresso = match[2].trim()
                logs.push(`Colaborador detectado (regex): ${h.cabecalho.nome_impresso}`)
              }
            }
          }

          // If in events, extract row
          if (inEvents && h.cabecalho.nome_impresso) {
            let codVal = colCod >= 0 ? row[colCod]?.trim() : row[0]?.trim()
            let descText = colDesc >= 0 ? row[colDesc]?.trim() : row[1]?.trim()
            let refVal = colRef >= 0 ? row[colRef]?.trim() : row[2]?.trim()
            let vencVal = colVenc >= 0 ? safeParseFloat(row[colVenc]) : 0
            let descVal = colDescVal >= 0 ? safeParseFloat(row[colDescVal]) : 0

            if (colCod === -1) {
              const nums = extractNumbers(row)
              const descCand = row.find(
                (c) => c && isNaN(Number(c.replace(/,/g, '.'))) && c.length > 2,
              )
              if (descCand) descText = descCand
              if (nums.length >= 2) {
                vencVal = nums[0]
                descVal = nums[1]
              } else if (nums.length === 1) {
                if (rowText.includes('DESCONTO') || descText.toUpperCase().includes('DESC')) {
                  descVal = nums[0]
                } else {
                  vencVal = nums[0]
                }
              }
            }

            if (
              (vencVal > 0 || descVal > 0) &&
              descText &&
              descText.length > 1 &&
              !descText.toUpperCase().includes('TOTAL') &&
              !descText.toUpperCase().includes('LÍQUIDO') &&
              !descText.toUpperCase().includes('SALÁRIO BASE')
            ) {
              h.linhas.push({
                codigo: codVal || '00',
                descricao: descText,
                referencia: refVal,
                vencimento: vencVal,
                desconto: descVal,
              })
            }
          }
        }

        // Finalize last holerite if open
        if (h.cabecalho.nome_impresso && h.linhas.length > 0) {
          if (h.totais.vencimentos === 0)
            h.totais.vencimentos = h.linhas.reduce((acc, l: any) => acc + (l.vencimento || 0), 0)
          if (h.totais.descontos === 0)
            h.totais.descontos = h.linhas.reduce((acc, l: any) => acc + (l.desconto || 0), 0)
          if (h.totais.liquido === 0) h.totais.liquido = h.totais.vencimentos - h.totais.descontos
          methodExtracted.push({ ...h })
          logs.push(`Holerite fechado no final do arquivo para: ${h.cabecalho.nome_impresso}`)
        }

        finalExtracted = [...finalExtracted, ...methodExtracted]
      }

      const extracted = []
      const mappedColabIds = new Set()

      for (const empData of finalExtracted) {
        const empName = (empData.cabecalho.nome_impresso || '').trim()
        const empCode = (empData.cabecalho.codigo || '').trim()
        const empCargo = (empData.cabecalho.cargo || '').trim()

        let colab = null
        if (empCode && empCode !== '00') {
          const possibleColab = colabs.find((c) => c.codigo_funcionario === empCode)
          if (possibleColab) {
            const normEmpName = empName.toUpperCase().replace(/\s+/g, ' ').trim()
            const normColabName = (possibleColab.nome || '')
              .toUpperCase()
              .replace(/\s+/g, ' ')
              .trim()
            const empTokens = normEmpName.split(' ').filter((t) => t.length > 2)
            const colabTokens = normColabName.split(' ').filter((t) => t.length > 2)
            if (empTokens.some((t) => colabTokens.includes(t)) || normEmpName === normColabName)
              colab = possibleColab
          }
        }

        if (!colab && empName) {
          const normEmpName = empName.toUpperCase().replace(/\s+/g, ' ').trim()
          colab = colabs.find(
            (c) => !mappedColabIds.has(c.id) && (c.nome || '').toUpperCase().trim() === normEmpName,
          )
          if (!colab) {
            colab = colabs.find((c) => {
              if (mappedColabIds.has(c.id)) return false
              const normColabName = (c.nome || '').toUpperCase().replace(/\s+/g, ' ').trim()
              const empTokens = normEmpName.split(' ').filter((t) => t.length > 2)
              const colabTokens = normColabName.split(' ').filter((t) => t.length > 2)
              if (empTokens.length > 0 && colabTokens.length > 0) {
                const matchCount = empTokens.filter((t) => colabTokens.includes(t)).length
                return (
                  empTokens[0] === colabTokens[0] &&
                  (matchCount >= 2 || (empTokens.length === 1 && colabTokens.length === 1))
                )
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
            error_msg = `Divergência de segurança: Planilha (Cód: ${empCode}) vs Sistema (Cód: ${colab.codigo_funcionario} / Nome: ${colab.nome}). Corrija para importar.`
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
            cargo: empCargo || colab?.cargo || '',
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
          cargo: empCargo || colab?.cargo || '',
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
        if (sheetNames.length > 0 && parsedData[sheetNames[0]]) {
          const sample = parsedData[sheetNames[0]].slice(0, 3)
          logs.push(`Amostra inicial do arquivo: ${JSON.stringify(sample)}`)
        }
        setParsingErrorDetails(logs)
        toast.error(
          'Falha na leitura da planilha. O arquivo não corresponde a nenhum formato reconhecido.',
        )
      } else {
        setExtractedData(extracted)
        toast.success('Planilha processada com sucesso! Prévia carregada.')
        const firstMapped = extracted.find((e) => e.is_mapped) || extracted[0]
        if (firstMapped)
          setTimeout(() => setPreviewData({ ...firstMapped, mes_ano: selectedMonth }), 500)
      }
    } catch (error: any) {
      console.error(error)
      setParsingErrorDetails([error.message])
      toast.error('Erro ao processar o arquivo: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const publish = async () => {
    const errorCount = extractedData.filter((e) => e.has_error).length
    if (errorCount > 0) {
      toast.error(
        'Não é possível publicar: Há divergências de segurança entre código e nome do funcionário.',
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
            assinado: false,
            data_assinatura: null,
          })
        }
      })
      const inserts = Array.from(insertsMap.values())
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
            <strong>Leitura Flexível Ativada:</strong> O sistema buscará padrões conhecidos e nomes
            de funcionários, além de ignorar cabeçalhos desnecessários, melhorando a adaptação a
            diferentes formatos.
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
          <div className="space-y-4">
            {parsingErrorDetails && !processing && (
              <Alert
                variant="destructive"
                className="animate-in fade-in slide-in-from-top-2 duration-300 border-red-200 bg-red-50 text-red-900"
              >
                <AlertTitle className="font-bold flex items-center gap-2">
                  <TableIcon className="w-4 h-4" /> Erro de Processamento
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p>
                    O sistema leu o arquivo, mas não conseguiu extrair os dados. Verifique os logs
                    técnicos abaixo para entender o que foi lido:
                  </p>
                  <div className="mt-4 pt-3 border-t border-red-200/50">
                    <p className="text-xs font-bold mb-2 uppercase opacity-70">
                      Logs de Extração (Técnico)
                    </p>
                    <div className="bg-white/50 rounded-md p-3 max-h-[150px] overflow-y-auto text-xs font-mono space-y-1">
                      {parsingErrorDetails.length > 0 ? (
                        parsingErrorDetails.map((log, i) => <div key={i}>{log}</div>)
                      ) : (
                        <div>Nenhum log gerado. Arquivo pode estar vazio.</div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/50 transition-colors">
              <TableIcon className="w-12 h-12 text-green-600 mb-4" />
              <p className="text-lg font-medium mb-1">Arraste a planilha Excel aqui</p>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar (.xlsx, .xls, .csv)
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
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-medium">Mapeamento Concluído</p>
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
                        <div className="flex flex-col">
                          <span>
                            {d.dados_extraidos?.cabecalho?.codigo &&
                            d.dados_extraidos.cabecalho.codigo !== '00' &&
                            d.dados_extraidos.cabecalho.codigo !== d.nome
                              ? `${d.dados_extraidos.cabecalho.codigo} - `
                              : ''}
                            {d.nome}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {d.cargo}
                          </span>
                        </div>
                        {d.is_mapped === false && !d.has_error && (
                          <span className="text-xs text-muted-foreground font-normal mt-1 block">
                            (Não mapeado)
                          </span>
                        )}
                        {d.has_error && (
                          <span className="text-xs text-red-600 font-semibold block mt-1">
                            ⚠️ {d.error_msg}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        R$ {d.valor_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.has_error ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Divergência Crítica
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewData({ ...d, mes_ano: selectedMonth })}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Visualizar
                        </Button>
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

  const fetchData = () => {
    if (colaborador) {
      supabase
        .from('contracheques')
        .select('*')
        .eq('colaborador_id', colaborador.id)
        .eq('mes_ano', selectedMonth)
        .single()
        .then(({ data }) => setContracheque(data))
    }
  }

  useEffect(() => {
    fetchData()
  }, [colaborador, selectedMonth])

  const handleSign = async (assinaturaNome: string) => {
    if (!contracheque) return
    try {
      const { error } = await supabase
        .from('contracheques')
        .update({
          assinado: true,
          data_assinatura: new Date().toISOString(),
          assinatura_nome: assinaturaNome,
        })
        .eq('id', contracheque.id)
      if (error) throw error
      toast.success('Assinatura registrada com sucesso!')
      fetchData()
      setPreviewData(null)
    } catch (err: any) {
      toast.error('Erro ao assinar: ' + err.message)
    }
  }

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
            {contracheque.assinado ? (
              <div className="flex flex-col items-center gap-2 mb-6">
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Assinado em{' '}
                  {new Date(contracheque.data_assinatura).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm max-w-sm text-center">
                <strong>Ação Necessária:</strong> Seu holerite requer confirmação de recebimento.
                Por favor, visualize e assine.
              </div>
            )}
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
                    assinado: contracheque.assinado,
                    data_assinatura: contracheque.data_assinatura,
                    assinatura_nome: contracheque.assinatura_nome,
                    id: contracheque.id,
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
        onSign={handleSign}
        isEmployeeView={true}
      />
    </Card>
  )
}

function ContraChequeDataModal({
  data,
  isOpen,
  onClose,
  onSign,
  isEmployeeView = false,
}: {
  data: any
  isOpen: boolean
  onClose: () => void
  onSign?: (signature: string) => void
  isEmployeeView?: boolean
}) {
  const [signature, setSignature] = useState('')

  useEffect(() => {
    if (isOpen) setSignature('')
  }, [isOpen])

  if (!data) return null

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value || 0,
    )

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

        {isEmployeeView && !data.assinado && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4 print:hidden shrink-0">
            <PenTool className="h-4 w-4 text-blue-600" />
            <AlertTitle>Assinatura Digital Necessária</AlertTitle>
            <AlertDescription>
              <div className="mb-3">
                Declaro ter recebido a importância líquida discriminada neste recibo e confirmo a
                veracidade das informações apresentadas para a competência selecionada.
              </div>
              <div className="flex flex-col gap-2 max-w-sm mt-4">
                <label htmlFor="signature" className="text-sm font-medium">
                  Digite seu nome completo para assinar eletronicamente:
                </label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-white border-blue-300 focus-visible:ring-blue-500 text-black"
                />
              </div>
            </AlertDescription>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              onClick={() => onSign && onSign(signature)}
              disabled={signature.trim().length < 5}
            >
              Confirmar Recebimento e Assinar
            </Button>
          </Alert>
        )}

        <div className="w-full overflow-x-auto print:overflow-visible pb-4 flex justify-center">
          <div className="bg-white text-black font-mono text-[11px] border border-slate-400 p-3 flex relative min-w-[750px] w-full max-w-[900px] shadow-sm print-area print:min-w-0 print:w-full print:max-w-[180mm] print:border-none print:shadow-none print:overflow-hidden print:p-0 print:m-0">
            <div className="flex-1 flex flex-col border-[1.5px] border-black box-border relative z-10 bg-white">
              {data.assinado && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 opacity-15 mix-blend-multiply">
                  <div className="border-[8px] border-green-600 text-green-600 text-6xl font-black uppercase py-4 px-10 rotate-[-30deg] rounded-2xl tracking-widest print:opacity-[0.15]">
                    Assinado
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 border-b-[1.5px] border-black p-2 pb-3">
                <div className="col-span-1 space-y-1">
                  <div className="font-bold uppercase tracking-tight text-sm">
                    {mockData.empresa?.nome || 'SERVICELOGIC.COM SOLUCOES EM TECNOLOGIA LTDA'}
                  </div>
                  <div className="text-xs">
                    CNPJ:&nbsp;&nbsp;{mockData.empresa?.cnpj || '10.929.600/0001-92'}
                  </div>
                </div>
                <div className="col-span-1 text-center space-y-1">
                  <div className="text-xs">CC: Centro de Custo</div>
                  <div className="text-xs">Mensalista</div>
                </div>
                <div className="col-span-1 text-right space-y-1">
                  <div className="text-xs">Folha Mensal</div>
                  <div className="capitalize text-xs">
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

              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] border-b-[1.5px] border-black text-xs">
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-0.5">Código</div>
                  <div className="font-bold text-center">{mockData.cabecalho?.codigo || '00'}</div>
                </div>
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-0.5">Nome do Funcionário</div>
                  <div className="font-bold uppercase tracking-tight">
                    {mockData.cabecalho?.nome_impresso || data.nome}
                  </div>
                  <div className="uppercase text-[10px] mt-1 text-slate-700">
                    {mockData.cabecalho?.cargo || data.cargo || ''}
                  </div>
                </div>
                <div className="border-r border-black p-1.5 px-3 text-center">
                  <div className="text-[9px] mb-0.5">CBO</div>
                  <div className="font-medium">{mockData.cabecalho?.cbo || '212420'}</div>
                  <div className="text-[9px] mt-1">Admissão:</div>
                </div>
                <div className="border-r border-black p-1.5 px-3 text-center">
                  <div className="text-[9px] mb-0.5">Departamento</div>
                  <div className="font-medium">
                    {mockData.cabecalho?.departamento || data.departamento || '1'}
                  </div>
                  <div className="mt-1 font-medium">
                    {mockData.cabecalho?.admissao || '01/01/2023'}
                  </div>
                </div>
                <div className="p-1.5 px-3 text-center">
                  <div className="text-[9px] mb-0.5">Filial</div>
                  <div className="font-medium">{mockData.cabecalho?.filial || '1'}</div>
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] border-b-[1.5px] border-black font-bold text-[11px] bg-slate-50/50 print:bg-transparent">
                <div className="border-r border-black p-1 text-center w-[60px]">Código</div>
                <div className="border-r border-black p-1 pl-2 text-left">Descrição</div>
                <div className="border-r border-black p-1 text-center w-[80px]">Referência</div>
                <div className="border-r border-black p-1 text-center w-[110px]">Vencimentos</div>
                <div className="p-1 text-center w-[110px]">Descontos</div>
              </div>

              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] flex-1 min-h-[300px] text-[12px] print:text-[11px]">
                <div className="border-r border-black p-1 flex flex-col items-center w-[60px]">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.codigo}
                    </div>
                  ))}
                </div>
                <div className="border-r border-black p-1 pl-2 flex flex-col items-start uppercase">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem] truncate">
                      {l.descricao}
                    </div>
                  ))}
                </div>
                <div className="border-r border-black p-1 flex flex-col items-end pr-3 w-[80px]">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.referencia}
                    </div>
                  ))}
                </div>
                <div className="border-r border-black p-1 flex flex-col items-end pr-2 w-[110px]">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.vencimento ? formatNumber(l.vencimento) : '\u00A0'}
                    </div>
                  ))}
                </div>
                <div className="p-1 flex flex-col items-end pr-2 w-[110px]">
                  {mockData.linhas?.map((l: any, i: number) => (
                    <div key={i} className="min-h-[1.25rem]">
                      {l.desconto ? formatNumber(l.desconto) : '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] border-t-[1.5px] border-black h-[60px]">
                <div className="border-r border-black"></div>
                <div className="border-r border-black w-[110px] flex flex-col">
                  <div className="text-[9px] p-1 border-b border-black text-center font-medium bg-slate-50/50 print:bg-transparent">
                    Total de Vencimentos
                  </div>
                  <div className="p-2 flex-1 flex items-center justify-end pr-2 font-bold text-[13px]">
                    {formatNumber(mockData.totais?.vencimentos || 0)}
                  </div>
                </div>
                <div className="w-[110px] flex flex-col">
                  <div className="text-[9px] p-1 border-b border-black text-center font-medium bg-slate-50/50 print:bg-transparent">
                    Total de Descontos
                  </div>
                  <div className="p-2 flex-1 flex items-center justify-end pr-2 font-bold text-[13px]">
                    {formatNumber(mockData.totais?.descontos || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] border-t-[1.5px] border-black h-[50px]">
                <div className="border-r border-black flex justify-end items-center pr-4">
                  <span className="text-[10px] mr-6 font-medium">Valor Líquido</span>
                  <span className="text-2xl leading-none font-light">⇨</span>
                </div>
                <div className="w-[220px] flex items-center justify-end pr-4 font-bold text-[16px] bg-slate-50/50 print:bg-transparent">
                  {formatNumber(mockData.totais?.liquido || 0)}
                </div>
              </div>

              <div className="grid grid-cols-6 border-t-[1.5px] border-black text-center bg-slate-50/50 print:bg-transparent">
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-1">Salário Base</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.salario_base || 0)}
                  </div>
                </div>
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-1">Sal. Contr. INSS</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.sal_contr_inss || 0)}
                  </div>
                </div>
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-1">Base Cálc. FGTS</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.base_calc_fgts || 0)}
                  </div>
                </div>
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-1">F.G.T.S do Mês</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.fgts_mes || 0)}
                  </div>
                </div>
                <div className="border-r border-black p-1.5 px-2">
                  <div className="text-[9px] mb-1">Base Cálc. IRRF</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.base_calc_irrf || 0)}
                  </div>
                </div>
                <div className="p-1.5 px-2">
                  <div className="text-[9px] mb-1">Faixa IRRF</div>
                  <div className="font-bold text-[11px]">
                    {formatNumber(mockData.bases?.faixa_irrf || 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[50px] sm:w-[60px] border-y-[1.5px] border-r-[1.5px] border-black flex flex-col relative bg-white shrink-0 box-border ml-[2px]">
              <div className="flex flex-row flex-1 justify-center items-center py-6 px-1 gap-2">
                <div
                  className="text-[10px] whitespace-nowrap transform rotate-180 text-slate-800 print:text-black font-medium tracking-tight"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Declaro ter recebido a importância liquida discriminada neste recibo.
                </div>
                <div
                  className="text-[11px] whitespace-nowrap transform rotate-180 font-bold tracking-widest"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Assinatura do Funcionário
                </div>
              </div>
              <div className="w-full flex flex-col px-2 z-10 pb-8 gap-8">
                <div className="flex items-end justify-between">
                  <span className="text-[10px] transform -rotate-90 origin-bottom-left translate-y-3 font-medium">
                    Data
                  </span>
                  <span className="border-b border-black w-full translate-y-2 ml-1 relative">
                    {data.assinado && (
                      <span className="absolute bottom-1 right-0 text-[9px] font-bold text-green-700 leading-none">
                        {new Date(data.data_assinatura).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </span>
                </div>
                <div className="border-b border-black w-full relative h-4">
                  {data.assinado && (
                    <span className="absolute bottom-1 w-full text-center text-[9px] font-bold text-green-700 leading-none truncate block uppercase">
                      {data.assinatura_nome || 'ASSINADO DIGITALMENTE'}
                    </span>
                  )}
                </div>
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
