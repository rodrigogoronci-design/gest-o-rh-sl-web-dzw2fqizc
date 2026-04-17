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
  Scale,
  Table as TableIcon,
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
  const [activeTab, setActiveTab] = useState('upload')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="upload">Importar Excel</TabsTrigger>
        <TabsTrigger value="historico">Histórico Geral</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <AdminUpload onPublishSuccess={() => setActiveTab('historico')} />
      </TabsContent>
      <TabsContent value="historico">
        <AdminHistorico />
      </TabsContent>
    </Tabs>
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
  const [compareData, setCompareData] = useState<any>(null)

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

      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, salario, departamento, data_admissao, role')
        .or('status.eq.Ativo,status.is.null')

      if (!colabs) throw new Error('Erro ao buscar colaboradores no sistema')

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
        if (rawRows.length > 0 && !Array.isArray(rawRows[0])) {
          const keys = Object.keys(rawRows[0])
          rawRows = [keys, ...rawRows.map((r) => keys.map((k) => r[k]))]
        }

        let h = getEmptyHolerite()
        let state = 'SEARCHING'
        let colMap = { codigo: -1, descricao: -1, referencia: -1, vencimentos: -1, descontos: -1 }

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i] || []
          const cells = row.map((c: any) => String(c || '').trim())
          const rowTextUpper = cells.join(' ').toUpperCase()

          if (!rowTextUpper.trim()) continue

          if (
            state === 'FOOTER' &&
            (rowTextUpper.includes('NOME DO FUNCION') ||
              rowTextUpper.includes('SERVICELOGIC') ||
              rowTextUpper.includes('RECIBO DE PAGAMENTO'))
          ) {
            if (h.cabecalho.nome_impresso || h.linhas.length > 0) finalExtracted.push(h)
            h = getEmptyHolerite()
            state = 'SEARCHING'
          }

          if (state === 'SEARCHING') {
            if (rowTextUpper.includes('CNPJ:')) {
              const match = rowTextUpper.match(/CNPJ:\s*([\d./-]+)/)
              if (match) h.empresa.cnpj = match[1]
              if (i > 0) {
                const prevRowText = rawRows[i - 1]
                  .map((c: any) => String(c || '').trim())
                  .filter((c: any) => c)
                  .join(' ')
                if (prevRowText.length > 5) h.empresa.nome = prevRowText
              }
            }

            if (rowTextUpper.includes('NOME DO FUNCION') || rowTextUpper.includes('FUNCIONÁRIO')) {
              for (let j = 0; j < cells.length; j++) {
                if (cells[j].toUpperCase().includes('FUNCION')) {
                  if (i + 1 < rawRows.length) {
                    const val = String(rawRows[i + 1][j] || '').trim()
                    const match = val.match(/^(\d+)\s*[-|–]?\s*(.+)$/)
                    if (match) {
                      h.cabecalho.codigo = match[1]
                      h.cabecalho.nome_impresso = match[2].trim()
                    } else if (val && !val.toUpperCase().includes('CBO')) {
                      h.cabecalho.nome_impresso = val
                      if (j > 0 && rawRows[i + 1][j - 1])
                        h.cabecalho.codigo = String(rawRows[i + 1][j - 1]).trim()
                    }
                  }
                }
              }
              if (!h.cabecalho.nome_impresso) {
                for (let c of cells) {
                  const m = c.match(/^(\d+)\s+([A-ZÀ-Ú\s]{5,})$/i)
                  if (m && !c.toUpperCase().includes('CBO')) {
                    h.cabecalho.codigo = m[1]
                    h.cabecalho.nome_impresso = m[2].trim()
                  }
                }
              }
            }

            if (rowTextUpper.includes('DESCRIÇÃO') || rowTextUpper.includes('DESCRICAO')) {
              colMap.codigo = cells.findIndex(
                (c) => c.toUpperCase() === 'CÓDIGO' || c.toUpperCase() === 'CODIGO',
              )
              colMap.descricao = cells.findIndex(
                (c) =>
                  c.toUpperCase().includes('DESCRIÇÃO') || c.toUpperCase().includes('DESCRICAO'),
              )
              colMap.referencia = cells.findIndex(
                (c) =>
                  c.toUpperCase().includes('REFERÊNCIA') || c.toUpperCase().includes('REFERENCIA'),
              )
              colMap.vencimentos = cells.findIndex(
                (c) =>
                  c.toUpperCase().includes('VENCIMENTO') || c.toUpperCase().includes('PROVENTO'),
              )
              colMap.descontos = cells.findIndex((c) => c.toUpperCase().includes('DESCONTO'))
              state = 'EVENTS'
              continue
            }
          }

          if (state === 'EVENTS') {
            if (
              rowTextUpper.includes('TOTAL DE VENCIMENTOS') ||
              rowTextUpper.includes('TOTAL DE DESCONTOS') ||
              rowTextUpper.includes('VALOR LÍQUIDO') ||
              rowTextUpper.includes('SALÁRIO BASE') ||
              (rowTextUpper.includes('TOTAL') && !rowTextUpper.includes('VENCIMENTOS'))
            ) {
              state = 'FOOTER'
            } else {
              let evtCode = colMap.codigo >= 0 ? cells[colMap.codigo] : ''
              let desc = colMap.descricao >= 0 ? cells[colMap.descricao] : ''
              let ref = colMap.referencia >= 0 ? cells[colMap.referencia] : ''
              let venc = colMap.vencimentos >= 0 ? cells[colMap.vencimentos] : ''
              let descVal = colMap.descontos >= 0 ? cells[colMap.descontos] : ''

              if (!evtCode && desc) {
                const m = desc.match(/^(\d+)\s+(.+)$/)
                if (m) {
                  evtCode = m[1]
                  desc = m[2].trim()
                }
              }
              if (!desc && evtCode) {
                const m = evtCode.match(/^(\d+)\s+(.+)$/)
                if (m) {
                  evtCode = m[1]
                  desc = m[2].trim()
                }
              }
              if (!desc && !evtCode) {
                for (let j = 0; j < cells.length; j++) {
                  let c = cells[j]
                  if (c && /[a-zA-Z]/.test(c) && !c.includes('R$')) {
                    const m = c.match(/^(\d+)\s+(.+)$/)
                    if (m) {
                      evtCode = m[1]
                      desc = m[2].trim()
                    } else {
                      desc = c
                      if (j > 0 && /^\d+$/.test(cells[j - 1])) evtCode = cells[j - 1]
                    }
                    break
                  }
                }
              }

              if (desc) {
                h.linhas.push({
                  codigo: evtCode,
                  descricao: desc,
                  referencia: ref,
                  vencimento: safeParseFloat(venc),
                  desconto: safeParseFloat(descVal),
                })
              }
            }
          }

          if (state === 'FOOTER') {
            if (
              rowTextUpper.includes('TOTAL DE VENCIMENTOS') ||
              rowTextUpper.includes('TOTAL DE DESCONTOS') ||
              rowTextUpper.includes('TOTAIS') ||
              rowTextUpper.includes('TOTAL')
            ) {
              const nums = extractNumbers(cells)
              if (nums.length >= 2) {
                h.totais.vencimentos = nums[nums.length - 2]
                h.totais.descontos = nums[nums.length - 1]
              } else if (colMap.vencimentos >= 0 && colMap.descontos >= 0) {
                h.totais.vencimentos = safeParseFloat(cells[colMap.vencimentos])
                h.totais.descontos = safeParseFloat(cells[colMap.descontos])
              }
            }

            if (rowTextUpper.includes('VALOR LÍQUIDO') || rowTextUpper.includes('LIQUIDO')) {
              const match = rowTextUpper.match(/L[ÍI]QUIDO.*?R?\$?\s*([-]?[\d.,]+)/i)
              if (match) {
                h.totais.liquido = safeParseFloat(match[1])
              } else {
                const nums = extractNumbers(cells)
                if (nums.length > 0) h.totais.liquido = nums[nums.length - 1]
              }
            }

            if (
              rowTextUpper.includes('SALÁRIO BASE') ||
              rowTextUpper.includes('SAL. CONTR. INSS')
            ) {
              if (i + 1 < rawRows.length) {
                const baseHeaders = cells.map((c) => c.toUpperCase())
                const baseVals = rawRows[i + 1].map((c: any) => String(c || '').trim())
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
                  const nums = extractNumbers(rawRows[i + 1])
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

        if (h.cabecalho.nome_impresso || h.linhas.length > 0) {
          finalExtracted.push(h)
        }
      }

      const extracted = []

      for (const empData of finalExtracted) {
        const empName = empData.cabecalho.nome_impresso || ''
        const empCode = empData.cabecalho.codigo || ''

        // Find match in DB
        const colab = colabs.find((c) => {
          if (!empName) return false
          const nameMatches =
            (c.nome || '').toUpperCase().includes(empName.toUpperCase()) ||
            empName.toUpperCase().includes((c.nome || '').toUpperCase())
          const codeMatches =
            empCode &&
            (String(c.id).includes(empCode) ||
              String(c.cpf).includes(empCode) ||
              String(c.rg).includes(empCode))

          if (empName === empCode) return codeMatches || nameMatches
          return nameMatches || codeMatches
        })

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
                : '01/01/2023'),
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
          is_mapped: !!colab,
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
    const validData = extractedData.filter((e) => e.is_mapped !== false)
    if (!validData.length) {
      toast.error('Nenhum colaborador mapeado para publicar.')
      return
    }

    setPublishing(true)
    try {
      const inserts = validData.map((e) => ({
        colaborador_id: e.colaborador_id,
        mes_ano: selectedMonth,
        arquivo_url: e.arquivo_url,
        valor_liquido: e.valor_liquido,
        dados_extraidos: e.dados_extraidos,
      }))
      const { error } = await supabase
        .from('contracheques')
        .upsert(inserts as any, { onConflict: 'colaborador_id, mes_ano' })

      if (error) throw error

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
                    <TableHead>Eventos Lidos</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.map((d, i) => (
                    <TableRow
                      key={i}
                      className={d.is_mapped === false ? 'opacity-60 bg-muted/30' : ''}
                    >
                      <TableCell className="font-medium">
                        {d.dados_extraidos?.cabecalho?.codigo &&
                        d.dados_extraidos.cabecalho.codigo !== '00' &&
                        d.dados_extraidos.cabecalho.codigo !== d.nome
                          ? `${d.dados_extraidos.cabecalho.codigo} - `
                          : ''}
                        {d.nome}
                        {d.is_mapped === false && (
                          <span className="ml-2 text-xs text-red-500 font-normal">
                            (Não mapeado)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.dados_extraidos?.linhas?.length || 0} linhas mapeadas
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        R${' '}
                        {d.valor_liquido?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.is_mapped !== false ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Fiel
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
                            variant="outline"
                            size="sm"
                            onClick={() => setCompareData(d)}
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                          >
                            <Scale className="w-4 h-4 mr-2" /> Auditar
                          </Button>
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
      <ComparacaoModal
        data={compareData}
        isOpen={!!compareData}
        onClose={() => setCompareData(null)}
      />
    </Card>
  )
}

function ComparacaoModal({
  data,
  isOpen,
  onClose,
}: {
  data: any
  isOpen: boolean
  onClose: () => void
}) {
  if (!data) return null

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value || 0,
    )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auditoria de Extração XLSX</DialogTitle>
          <DialogDescription>
            Confirmação de que todas as linhas, colunas e eventos do arquivo importado foram
            preservados e tabulados sem invenções ou exclusões.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 bg-slate-50 border rounded-lg overflow-hidden">
          <div className="bg-slate-100 p-3 border-b flex justify-between items-center">
            <span className="font-semibold text-slate-700">
              Eventos do Colaborador: {data.nome}
            </span>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Espelho 1:1 Excel
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead className="text-right">Vencimento</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.dados_extraidos.linhas.map((l: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{l.codigo}</TableCell>
                  <TableCell>{l.descricao}</TableCell>
                  <TableCell>{l.referencia}</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {l.vencimento ? `R$ ${formatNumber(l.vencimento)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {l.desconto ? `R$ ${formatNumber(l.desconto)}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">
                  Totais:
                </TableCell>
                <TableCell className="text-right font-bold text-blue-700">
                  R$ {formatNumber(data.dados_extraidos.totais.vencimentos)}
                </TableCell>
                <TableCell className="text-right font-bold text-red-700">
                  R$ {formatNumber(data.dados_extraidos.totais.descontos)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-slate-100">
                <TableCell colSpan={3} className="text-right font-bold text-slate-800">
                  Líquido a Receber:
                </TableCell>
                <TableCell colSpan={2} className="text-right font-bold text-xl text-green-700">
                  R$ {formatNumber(data.dados_extraidos.totais.liquido)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
      <DialogContent className="max-w-5xl w-full flex flex-col p-6 bg-slate-200 max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="hidden">
          <DialogTitle>Demonstrativo</DialogTitle>
        </DialogHeader>

        <div className="bg-white text-black font-mono text-[11px] border border-slate-400 p-1 flex relative overflow-x-auto min-w-[850px] shadow-sm">
          <div className="flex-1 flex flex-col border border-black">
            <div className="flex justify-between border-b border-black p-2">
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

            <div className="flex border-b border-black p-2">
              <div className="w-16">
                <div className="text-[10px]">Código</div>
                <div className="font-bold">{mockData.cabecalho?.codigo || '00'}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px]">Nome do Funcionário</div>
                <div className="font-bold uppercase">
                  {mockData.cabecalho?.nome_impresso || data.nome}
                </div>
                <div className="uppercase">{data.cargo || ''}</div>
              </div>
              <div className="w-24">
                <div className="text-[10px]">CBO</div>
                <div>{mockData.cabecalho?.cbo || '212420'}</div>
                <div className="mt-1 text-[10px]">Admissão:</div>
              </div>
              <div className="w-24 text-center">
                <div className="text-[10px]">Departamento</div>
                <div>{mockData.cabecalho?.departamento || data.departamento || '1'}</div>
                <div className="mt-1">{mockData.cabecalho?.admissao || '01/01/2023'}</div>
              </div>
              <div className="w-16 text-center">
                <div className="text-[10px]">Filial</div>
                <div>{mockData.cabecalho?.filial || '1'}</div>
              </div>
            </div>

            <div className="flex border-b border-black font-bold bg-slate-50">
              <div className="w-16 p-1 border-r border-black text-center">Código</div>
              <div className="flex-1 p-1 border-r border-black text-center">Descrição</div>
              <div className="w-24 p-1 border-r border-black text-center">Referência</div>
              <div className="w-32 p-1 border-r border-black text-center">Vencimentos</div>
              <div className="w-32 p-1 text-center">Descontos</div>
            </div>

            <div className="flex-1 min-h-[300px] flex text-[13px]">
              <div className="w-16 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas?.map((l: any, i: number) => (
                  <div key={i}>{l.codigo}</div>
                ))}
              </div>
              <div className="flex-1 border-r border-black p-1 flex flex-col px-2 space-y-1">
                {mockData.linhas?.map((l: any, i: number) => (
                  <div key={i}>{l.descricao}</div>
                ))}
              </div>
              <div className="w-24 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas?.map((l: any, i: number) => (
                  <div key={i}>{l.referencia}</div>
                ))}
              </div>
              <div className="w-32 border-r border-black p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas?.map((l: any, i: number) => (
                  <div key={i}>{l.vencimento ? formatNumber(l.vencimento) : '\u00A0'}</div>
                ))}
              </div>
              <div className="w-32 p-1 flex flex-col items-end px-2 space-y-1">
                {mockData.linhas?.map((l: any, i: number) => (
                  <div key={i}>{l.desconto ? formatNumber(l.desconto) : '\u00A0'}</div>
                ))}
              </div>
            </div>

            <div className="flex border-t border-black h-16">
              <div className="flex-1 border-r border-black"></div>
              <div className="w-32 border-r border-black flex flex-col justify-between">
                <div className="text-[10px] p-1 border-b border-black text-center">
                  Total de Vencimentos
                </div>
                <div className="p-2 text-right font-bold text-sm">
                  {formatNumber(mockData.totais?.vencimentos || 0)}
                </div>
              </div>
              <div className="w-32 flex flex-col justify-between">
                <div className="text-[10px] p-1 border-b border-black text-center">
                  Total de Descontos
                </div>
                <div className="p-2 text-right font-bold text-sm">
                  {formatNumber(mockData.totais?.descontos || 0)}
                </div>
              </div>
            </div>

            <div className="flex border-t border-black h-12">
              <div className="flex-1 flex justify-end items-center pr-4 border-r border-black">
                <span className="text-[10px] mr-4">Valor Líquido</span>
                <span className="text-xl leading-none translate-y-[-2px]">⇨</span>
              </div>
              <div className="w-64 flex items-center justify-end p-2 font-bold text-[15px] bg-slate-50">
                {formatNumber(mockData.totais?.liquido || 0)}
              </div>
            </div>

            <div className="flex border-t border-black text-[10px] text-center divide-x divide-black bg-slate-50">
              <div className="flex-1 p-1">
                <div>Salário Base</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.salario_base || 0)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Sal. Contr. INSS</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.sal_contr_inss || 0)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Base Cálc. FGTS</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.base_calc_fgts || 0)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>F.G.T.S do Mês</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.fgts_mes || 0)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Base Cálc. IRRF</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.base_calc_irrf || 0)}
                </div>
              </div>
              <div className="flex-1 p-1">
                <div>Faixa IRRF</div>
                <div className="font-bold text-sm">
                  {formatNumber(mockData.bases?.faixa_irrf || 0)}
                </div>
              </div>
            </div>
          </div>

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
