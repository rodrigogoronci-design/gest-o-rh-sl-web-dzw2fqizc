import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import useAppStore from '@/stores/useAppStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Eye, Download, Activity, Calendar, User, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function Atestados() {
  const { currentUser, users } = useAppStore()
  const { toast } = useToast()

  const [atestados, setAtestados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<any>(null)

  const [colaboradorId, setColaboradorId] = useState(currentUser?.id || '')
  const [dataInicio, setDataInicio] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!selectedFile?.arquivo_url) {
      setPreviewUrl(null)
      return
    }

    let isMounted = true
    setPreviewLoading(true)

    const loadUrl = async () => {
      let finalUrl = selectedFile.arquivo_url
      if (finalUrl.includes('/public/atestados/')) {
        const path = finalUrl.split('/public/atestados/')[1]
        const { data } = await supabase.storage.from('atestados').createSignedUrl(path, 3600)
        if (data?.signedUrl) finalUrl = data.signedUrl
      }

      if (isMounted) {
        setPreviewUrl(finalUrl)
        setPreviewLoading(false)
      }
    }

    loadUrl()

    return () => {
      isMounted = false
    }
  }, [selectedFile])
  const [dataFim, setDataFim] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchAtestados()
  }, [currentUser])

  const fetchAtestados = async () => {
    const { data } = await supabase
      .from('atestados')
      .select('*, colaboradores(nome)')
      .order('created_at', { ascending: false })
    setAtestados(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colaboradorId || !dataInicio || !dataFim || !file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('atestados').upload(fileName, file)
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('atestados').getPublicUrl(fileName)

      const start = parseISO(dataInicio)
      const end = parseISO(dataFim)
      const dias = differenceInDays(end, start) + 1

      const { error: dbError } = await supabase.from('atestados').insert({
        colaborador_id: colaboradorId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        quantidade_dias: dias > 0 ? dias : 1,
        arquivo_url: publicUrl,
      })

      if (dbError) throw dbError

      toast({ title: 'Atestado salvo com sucesso' })
      setIsOpen(false)
      setFile(null)
      fetchAtestados()
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    const fileName = url.split('/').pop()
    if (fileName) await supabase.storage.from('atestados').remove([fileName])
    await supabase.from('atestados').delete().eq('id', id)
    fetchAtestados()
    if (selectedFile?.id === id) setSelectedFile(null)
  }

  const validUsers = users.filter((u) => u.role === 'user')

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Atestados</h1>
          <p className="text-muted-foreground mt-1">Consulte as informações de afastamentos.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4" /> Novo Atestado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Atestado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={colaboradorId} onValueChange={setColaboradorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Arquivo (PDF ou JPG)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Enviando...' : 'Salvar Atestado'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
        <Card className="flex flex-col border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 py-3 shrink-0">
            <CardTitle className="text-sm text-slate-600 uppercase">Lista de Atestados</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <p>Carregando...</p>
            ) : atestados.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum atestado encontrado.</p>
            ) : (
              <div className="space-y-3">
                {atestados.map((a) => (
                  <div
                    key={a.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedFile?.id === a.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedFile(a)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {a.colaboradores?.nome || currentUser?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(a.data_inicio), 'dd/MM/yyyy')} a{' '}
                          {format(parseISO(a.data_fim), 'dd/MM/yyyy')} ({a.quantidade_dias} dias)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(a)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(a.id, a.arquivo_url)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex flex-col border-0 shadow-sm overflow-hidden bg-slate-50/50">
          <CardHeader className="bg-slate-50 py-3 shrink-0">
            <CardTitle className="text-sm text-slate-600 uppercase">
              Informações do Afastamento
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 relative overflow-y-auto">
            {!selectedFile ? (
              <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full opacity-50">
                <Activity className="w-16 h-16 mb-4" />
                <p>Selecione um atestado ao lado para visualizar os dados</p>
              </div>
            ) : (
              <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-blue-50/50 border-b p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 text-lg">Atestado Médico</h3>
                      <p className="text-sm text-blue-700/80">Comprovante de afastamento legal</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
                          Colaborador
                        </p>
                        <p className="font-medium text-slate-900">
                          {selectedFile.colaboradores?.nome}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 border-b pb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
                            Data de Início
                          </p>
                          <p className="font-medium text-slate-900">
                            {format(parseISO(selectedFile.data_inicio), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
                            Data de Retorno
                          </p>
                          <p className="font-medium text-slate-900">
                            {format(parseISO(selectedFile.data_fim), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
                          Período de Afastamento
                        </p>
                        <p className="font-semibold text-lg text-slate-900">
                          {selectedFile.quantidade_dias}{' '}
                          {selectedFile.quantidade_dias === 1 ? 'dia' : 'dias'}
                        </p>
                      </div>
                    </div>

                    {previewUrl && (
                      <div className="mt-6 border-t pt-6">
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-3">
                          Visualização do Documento
                        </p>
                        <div className="rounded-lg border bg-slate-50/50 overflow-hidden flex justify-center items-center relative min-h-[200px]">
                          {previewLoading ? (
                            <div className="p-8 text-muted-foreground flex flex-col items-center">
                              <Activity className="w-6 h-6 animate-pulse mb-2" />
                              <span className="text-sm">Carregando visualização...</span>
                            </div>
                          ) : selectedFile.arquivo_url.toLowerCase().match(/\.(pdf)$/) ? (
                            <iframe
                              src={`${previewUrl}#view=FitH`}
                              className="w-full h-[400px]"
                              title="Preview do Atestado"
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt="Preview do Atestado"
                              className="max-w-full max-h-[500px] object-contain"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 flex justify-between items-center border-t">
                    <span className="text-xs text-muted-foreground">
                      Adicionado em {format(parseISO(selectedFile.created_at), 'dd/MM/yyyy')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={async () => {
                        let finalUrl = selectedFile.arquivo_url
                        if (finalUrl.includes('/public/atestados/')) {
                          const path = finalUrl.split('/public/atestados/')[1]
                          const { data } = await supabase.storage
                            .from('atestados')
                            .createSignedUrl(path, 3600)
                          if (data?.signedUrl) finalUrl = data.signedUrl
                        }
                        const link = document.createElement('a')
                        link.href = finalUrl
                        link.target = '_blank'
                        link.download = `atestado-${selectedFile.id}`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Baixar Original
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
