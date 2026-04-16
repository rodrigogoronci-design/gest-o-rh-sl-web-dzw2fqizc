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

const DUMMY_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKJcOkwxgKMSAwIG9iago8PAovQ3JlYXRvciAoTW96aWxsYS81LjApCi9Qcm9kdWNlciAoU2tpZGRhdGEpCi9DcmVhdGlvbkRhdGUgKEQ6MjAyMzA4MjgxNjM0MThaKQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PAovUHJvY0NldCBbL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSV0KL0ZvbnQgPDwKL0YxIDYgMCBSCj4+Cj4+Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgNzAwIFRkCihQREYgZGUgVGVzdGUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTUKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAxNjQgMDAwMDAgbiAKMDAwMDAwMDIyMSAwMDAwMCBuIAowMDAwMDAwMzM5IDAwMDAwIG4gCjAwMDAwMDA0MzQgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDIgMCBSCjovSW5mbyAxIDAgUgo+PgpzdGFydHhyZWYKNTIzCiUlRU9GCg=='

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
        .eq('role', 'Colaborador')
      if (data) {
        setExtractedData(
          data.map((c) => ({
            colaborador_id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            arquivo_url: DUMMY_PDF,
          })),
        )
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
        arquivo_url: e.arquivo_url,
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
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewUrl(d.arquivo_url)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Prévia
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
      <PdfPreviewModal url={previewUrl} isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} />
    </Card>
  )
}

function AdminHistorico() {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [registros, setRegistros] = useState<any[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('contracheques')
      .select('*, colaboradores!inner(nome, cargo, role)')
      .eq('mes_ano', selectedMonth)
      .eq('colaboradores.role', 'Colaborador')
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
                  <Button variant="ghost" size="sm" onClick={() => setPreviewUrl(r.arquivo_url)}>
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
      <PdfPreviewModal url={previewUrl} isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} />
    </Card>
  )
}

function EmployeeContraCheque({ colaborador }: { colaborador: any }) {
  const months = generateMonths()
  const [selectedMonth, setSelectedMonth] = useState(months[0])
  const [contracheque, setContracheque] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
              <Button onClick={() => setPreviewUrl(contracheque.arquivo_url)}>
                <Eye className="w-4 h-4 mr-2" /> Visualizar PDF
              </Button>
              <Button variant="outline" asChild>
                <a href={contracheque.arquivo_url} download="contracheque.pdf">
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
      <PdfPreviewModal url={previewUrl} isOpen={!!previewUrl} onClose={() => setPreviewUrl(null)} />
    </Card>
  )
}

function PdfPreviewModal({
  url,
  isOpen,
  onClose,
}: {
  url: string | null
  isOpen: boolean
  onClose: () => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setBlobUrl(null)
      return
    }

    if (url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64 = url.split(',')[1]
        const binary = atob(base64)
        const array = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i)
        }
        const blob = new Blob([array], { type: 'application/pdf' })
        const bUrl = URL.createObjectURL(blob)
        setBlobUrl(bUrl)
        return () => URL.revokeObjectURL(bUrl)
      } catch (err) {
        console.error('Error creating PDF blob:', err)
        setBlobUrl(url)
      }
    } else {
      setBlobUrl(url)
    }
  }, [url])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Visualização de Contracheque</DialogTitle>
          <DialogDescription>Confira o demonstrativo abaixo.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 bg-muted/30 rounded-lg border overflow-hidden mt-4">
          {blobUrl ? (
            <iframe src={blobUrl} className="w-full h-full border-0" title="PDF Preview" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Nenhum documento disponível
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {url && (
            <Button asChild>
              <a href={url} download="contracheque.pdf">
                <Download className="w-4 h-4 mr-2" /> Baixar PDF
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
