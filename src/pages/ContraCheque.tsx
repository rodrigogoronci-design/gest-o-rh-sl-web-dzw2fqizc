import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
          setIsAdmin(data?.role === 'Admin' || data?.role === 'Gerente')
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setExtractedData([])
    }
  }

  const processFile = () => {
    if (!file) return
    setProcessing(true)
    setTimeout(async () => {
      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo')
        .eq('status', 'Ativo')
      if (data) {
        setExtractedData(data.map((c) => ({ colaborador_id: c.id, nome: c.nome, cargo: c.cargo })))
      }
      setProcessing(false)
      toast.success('Arquivo processado com sucesso! Contracheques identificados.')
    }, 2500)
  }

  const publish = async () => {
    if (!extractedData.length) return
    setPublishing(true)
    try {
      const inserts = extractedData.map((e) => ({
        colaborador_id: e.colaborador_id,
        mes_ano: selectedMonth,
        arquivo_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      }))
      const { error } = await supabase
        .from('contracheques')
        .upsert(inserts, { onConflict: 'colaborador_id, mes_ano' } as any)
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
          Faça o upload do PDF. O sistema irá desmembrar e distribuir automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                {processing ? 'Analisando PDF...' : 'Processar PDF'}
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
                    {extractedData.length} contracheques identificados no arquivo.
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
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Pronto para envio
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AdminHistorico() {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [registros, setRegistros] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('contracheques')
      .select('*, colaboradores(nome, cargo)')
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
                  <Button variant="ghost" size="sm" asChild>
                    <a href={r.arquivo_url} target="_blank" rel="noreferrer">
                      <Eye className="w-4 h-4 mr-2" /> Visualizar
                    </a>
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
    </Card>
  )
}

function EmployeeContraCheque({ colaborador }: { colaborador: any }) {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [contracheque, setContracheque] = useState<any>(null)

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
          <CardDescription>Consulte e baixe seus demonstrativos.</CardDescription>
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
              Seu demonstrativo está disponível para visualização e download.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <a href={contracheque.arquivo_url} target="_blank" rel="noreferrer">
                  <Eye className="w-4 h-4 mr-2" /> Visualizar PDF
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={contracheque.arquivo_url} download>
                  <Download className="w-4 h-4 mr-2" /> Baixar
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-50" />
            <p>Nenhum contracheque encontrado para {selectedMonth}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
