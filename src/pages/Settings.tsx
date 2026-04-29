import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Camera, Loader2, Save, LayoutDashboard, ShieldCheck } from 'lucide-react'

export default function Settings() {
  const [appName, setAppName] = useState('Gestão RH SL Web')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [savingAppearance, setSavingAppearance] = useState(false)

  const [requireApproval, setRequireApproval] = useState(false)
  const [allowEditPonto, setAllowEditPonto] = useState(true)
  const [allowedEscalaUsers, setAllowedEscalaUsers] = useState<string[]>([])
  const [usersList, setUsersList] = useState<{ id: string; name: string; role: string }[]>([])
  const [savingPermissions, setSavingPermissions] = useState(false)

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('*')
      .then(({ data }) => {
        if (data) {
          const logo = data.find((d) => d.chave === 'app_logo')?.valor as any
          if (logo?.url) setLogoPreview(logo.url)

          const name = data.find((d) => d.chave === 'app_name')?.valor as any
          if (name?.text) setAppName(name.text)

          const perms = data.find((d) => d.chave === 'app_permissions')?.valor as any
          if (perms) {
            setRequireApproval(perms.requireApproval ?? false)
            setAllowEditPonto(perms.allowEditPonto ?? true)
            setAllowedEscalaUsers(perms.allowedEscalaUsers ?? [])
          }
        }
      })

    supabase
      .from('colaboradores')
      .select('id, nome, role')
      .eq('status', 'Ativo')
      .then(({ data }) => {
        if (data) setUsersList(data.map((d) => ({ id: d.id, name: d.nome, role: d.role })))
      })
  }, [])

  const handleSaveAppearance = async () => {
    setSavingAppearance(true)
    try {
      let finalLogoUrl = logoPreview
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const filePath = `app-logo-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, logoFile)

        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalLogoUrl = data.publicUrl
      }

      await supabase.from('configuracoes').upsert([
        { chave: 'app_name', valor: { text: appName } },
        { chave: 'app_logo', valor: { url: finalLogoUrl } },
      ])

      toast.success('Configurações de aparência salvas! A página será recarregada.', {
        duration: 3000,
      })
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setSavingAppearance(false)
    }
  }

  const handleSavePermissions = async () => {
    setSavingPermissions(true)
    try {
      await supabase.from('configuracoes').upsert([
        {
          chave: 'app_permissions',
          valor: {
            requireApproval,
            allowEditPonto,
            allowedEscalaUsers,
          },
        },
      ])
      toast.success('Regras e permissões atualizadas com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao salvar permissões: ' + err.message)
    } finally {
      setSavingPermissions(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administração do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie configurações globais, aparência e regras de negócio.
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="appearance" className="gap-2">
            <LayoutDashboard className="w-4 h-4" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Regras e Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>Customize o logotipo e o nome da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3">
                <Label>Logotipo da Empresa</Label>
                <div className="flex items-end gap-6">
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem logo</span>
                    )}
                    <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Alterar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setLogoFile(e.target.files[0])
                            setLogoPreview(URL.createObjectURL(e.target.files[0]))
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground pb-2 max-w-[250px]">
                    Recomendamos uma imagem com fundo transparente (.png) e proporção quadrada ou
                    horizontal.
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label>Nome do Sistema</Label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ex: Meu RH Web"
                />
              </div>

              <Button onClick={handleSaveAppearance} disabled={savingAppearance}>
                {savingAppearance ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Aparência
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Negócio Globais</CardTitle>
              <CardDescription>
                Defina comportamentos padrão do sistema para todos os usuários.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Exigir Aprovação para Atestados</Label>
                  <p className="text-sm text-muted-foreground max-w-[80%]">
                    Se ativado, os atestados enviados pelos colaboradores precisarão de aprovação
                    manual por um gestor antes de contabilizar na folha.
                  </p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Permitir Edição de Ponto</Label>
                  <p className="text-sm text-muted-foreground max-w-[80%]">
                    Habilita os colaboradores a solicitarem ajustes ou editarem os próprios
                    registros de ponto de forma limitada.
                  </p>
                </div>
                <Switch checked={allowEditPonto} onCheckedChange={setAllowEditPonto} />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-base">Permissão para Lançar Escala</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione quais colaboradores podem gerenciar (lançar/editar) o Mural de
                    Plantões. Administradores já possuem acesso total.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {usersList
                    .filter((u) => u.role !== 'Admin' && u.role !== 'Gerente')
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 border p-3 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={allowedEscalaUsers.includes(u.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setAllowedEscalaUsers((prev) => [...prev, u.id])
                            else setAllowedEscalaUsers((prev) => prev.filter((id) => id !== u.id))
                          }}
                        />
                        <span className="text-sm font-medium">{u.name}</span>
                      </label>
                    ))}
                  {usersList.filter((u) => u.role !== 'Admin' && u.role !== 'Gerente').length ===
                    0 && (
                    <p className="text-sm text-muted-foreground col-span-full">
                      Nenhum colaborador selecionável encontrado.
                    </p>
                  )}
                </div>
              </div>

              <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                {savingPermissions ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Regras
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
