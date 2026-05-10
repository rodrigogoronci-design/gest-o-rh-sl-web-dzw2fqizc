import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'
import {
  Camera,
  Loader2,
  Save,
  LayoutDashboard,
  ShieldCheck,
  Check,
  ChevronsUpDown,
  X,
  Image as ImageIcon,
  Building2,
  Eye,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function Settings() {
  const [appName, setAppName] = useState('Gestão RH SL Web')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  const [loginLogoFile, setLoginLogoFile] = useState<File | null>(null)
  const [loginLogoPreview, setLoginLogoPreview] = useState<string>('')
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null)
  const [loginBgPreview, setLoginBgPreview] = useState<string>('')
  const [loginTemplate, setLoginTemplate] = useState('default')

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

          const loginSettings = data.find((d) => d.chave === 'app_login_settings')?.valor as any
          if (loginSettings) {
            if (loginSettings.logoUrl) setLoginLogoPreview(loginSettings.logoUrl)
            if (loginSettings.bgUrl) setLoginBgPreview(loginSettings.bgUrl)
            if (loginSettings.template) setLoginTemplate(loginSettings.template)
          }

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

      let finalLoginLogoUrl = loginLogoPreview
      if (loginLogoFile) {
        const fileExt = loginLogoFile.name.split('.').pop()
        const filePath = `login-logo-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, loginLogoFile)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalLoginLogoUrl = data.publicUrl
      }

      let finalLoginBgUrl = loginBgPreview
      if (loginBgFile) {
        const fileExt = loginBgFile.name.split('.').pop()
        const filePath = `login-bg-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, loginBgFile)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalLoginBgUrl = data.publicUrl
      }

      await supabase.from('configuracoes').upsert([
        { chave: 'app_name', valor: { text: appName } },
        { chave: 'app_logo', valor: { url: finalLogoUrl } },
        {
          chave: 'app_login_settings',
          valor: {
            logoUrl: finalLoginLogoUrl,
            bgUrl: finalLoginBgUrl,
            template: loginTemplate,
          },
        },
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

  const renderMockLogin = () => {
    const bgUrl = loginBgPreview
    const logoToUse = loginLogoPreview || logoPreview

    const mockHeader = (isDark = false, alignLeft = false) => (
      <div
        className={cn(
          'flex flex-col mb-8',
          alignLeft ? 'items-start text-left' : 'items-center text-center',
        )}
      >
        {logoToUse ? (
          <img
            src={logoToUse}
            alt="Logo"
            className={cn('h-16 w-auto object-contain mb-6', alignLeft && 'ml-0')}
          />
        ) : (
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg',
              isDark ? 'bg-white/20 shadow-black/20' : 'bg-primary shadow-primary/20',
            )}
          >
            <Building2
              className={cn('w-8 h-8', isDark ? 'text-white' : 'text-primary-foreground')}
            />
          </div>
        )}
        <h1
          className={cn(
            'text-3xl font-bold tracking-tight',
            isDark ? 'text-white' : 'text-slate-900',
            loginTemplate === 'dark-split' && 'text-4xl',
          )}
        >
          {loginTemplate === 'dark-split' ? (
            <>
              Faça o seu login<span className="text-pink-500">.</span>
            </>
          ) : (
            appName || 'Gestão RH SL Web'
          )}
        </h1>
        <p className={cn('mt-2 text-base', isDark ? 'text-white/60' : 'text-slate-500')}>
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>
    )

    const mockForm = (isDark = false) => {
      let inputClasses = 'h-11'
      let buttonClasses = 'w-full h-11 text-base transition-all'
      let labelClasses = ''

      if (isDark) {
        inputClasses = cn(
          inputClasses,
          'bg-black/20 border-white/20 text-white placeholder:text-white/50',
        )
        buttonClasses = cn(buttonClasses, 'bg-white text-black hover:bg-white/90')
        labelClasses = 'text-white'
      }

      if (loginTemplate === 'modern-glass') {
        inputClasses =
          'h-12 bg-transparent border-0 border-b-2 border-white/30 rounded-none px-2 text-white placeholder:text-white/50 transition-colors'
        buttonClasses =
          'w-full h-12 text-base rounded-full bg-gradient-to-r from-[#4A00E0] to-[#8E2DE2] text-white hover:opacity-90 border-0 shadow-lg'
        labelClasses = 'text-white/80 text-sm font-normal'
      } else if (loginTemplate === 'dark-split') {
        inputClasses =
          'h-14 bg-[#1e1e24] border-0 text-white rounded-xl px-4 placeholder:text-white/40'
        buttonClasses =
          'w-full h-14 text-base rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold hover:opacity-90 border-0 shadow-lg'
        labelClasses = 'text-white/70 text-sm font-normal mb-1'
      }

      return (
        <div className="space-y-6">
          <div className="space-y-2 text-left">
            <Label className={labelClasses}>
              {loginTemplate === 'dark-split' ? 'email' : 'Email corporativo'}
            </Label>
            <Input
              disabled
              placeholder={loginTemplate === 'dark-split' ? '' : 'seu.nome@empresa.com.br'}
              className={inputClasses}
            />
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <Label className={labelClasses}>
                {loginTemplate === 'dark-split' ? 'senha' : 'Senha'}
              </Label>
              {loginTemplate !== 'dark-split' && (
                <span
                  className={cn('text-sm font-medium', isDark ? 'text-white/80' : 'text-primary')}
                >
                  Esqueceu a senha?
                </span>
              )}
            </div>
            <Input
              disabled
              type="password"
              placeholder={loginTemplate === 'dark-split' ? '' : '••••••••'}
              className={inputClasses}
            />
            {loginTemplate === 'dark-split' && (
              <div className="flex justify-end pt-1">
                <span className="text-sm font-medium text-white/60">esqueci minha senha</span>
              </div>
            )}
          </div>
          <div className="pt-2">
            <Button disabled className={buttonClasses}>
              Entrar
            </Button>
          </div>
        </div>
      )
    }

    if (loginTemplate === 'split') {
      return (
        <div className="w-full min-h-[700px] h-full flex bg-background overflow-hidden relative">
          <div className="flex-1 hidden md:flex items-center justify-center relative bg-slate-900">
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 bg-primary/20" />
            )}
          </div>
          <div className="w-full md:w-[500px] flex flex-col items-center justify-center p-8 bg-white shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-20">
            <div className="w-full max-w-sm">
              {mockHeader()}
              {mockForm()}
            </div>
          </div>
        </div>
      )
    }

    if (loginTemplate === 'glass') {
      return (
        <div className="w-full min-h-[700px] h-full flex items-center justify-center p-4 relative overflow-hidden">
          {bgUrl ? (
            <img
              src={bgUrl}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900" />
          )}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl text-white">
              {mockHeader(true)}
              {mockForm(true)}
            </div>
          </div>
        </div>
      )
    }

    if (loginTemplate === 'modern-glass') {
      return (
        <div
          className="w-full min-h-[700px] h-full flex items-center justify-center p-4 relative overflow-hidden"
          style={{
            background: bgUrl
              ? `url(${bgUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #2a0845 0%, #6441A5 100%)',
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-[420px]">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white">
              {mockHeader(true)}
              {mockForm(true)}
            </div>
          </div>
        </div>
      )
    }

    if (loginTemplate === 'dark-split') {
      return (
        <div className="w-full min-h-[700px] h-full flex bg-[#0A0A0B] overflow-hidden relative">
          <div className="w-full md:w-1/2 flex flex-col justify-center p-12 z-20">
            <div className="w-full max-w-sm mx-auto">
              {mockHeader(true, true)}
              {mockForm(true)}
            </div>
          </div>
          <div className="flex-1 hidden md:flex relative overflow-hidden bg-[#121214]">
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen"
              />
            ) : (
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-screen" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B] via-transparent to-transparent" />
          </div>
        </div>
      )
    }

    return (
      <div className="w-full min-h-[700px] h-full flex flex-col items-center justify-center bg-slate-50 p-4 overflow-hidden">
        <div className="w-full max-w-md space-y-8">
          {mockHeader()}
          <Card className="border-0 shadow-elevation">
            <CardContent className="pt-6">{mockForm()}</CardContent>
          </Card>
        </div>
      </div>
    )
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

              <div className="pt-8 mt-8 border-t space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Tela de Login</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize a experiência de autenticação do sistema.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-3">
                    <Label>Logotipo Específico (Login)</Label>
                    <div className="flex items-end gap-6">
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        {loginLogoPreview ? (
                          <img
                            src={loginLogoPreview}
                            alt="Login Logo Preview"
                            className="max-w-full max-h-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground text-center p-2">
                            Igual ao principal
                          </span>
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
                                setLoginLogoFile(e.target.files[0])
                                setLoginLogoPreview(URL.createObjectURL(e.target.files[0]))
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex flex-col gap-2">
                        {loginLogoPreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLoginLogoFile(null)
                              setLoginLogoPreview('')
                            }}
                          >
                            Remover
                          </Button>
                        )}
                        <div className="text-sm text-muted-foreground max-w-[200px]">
                          Opcional. Se vazio, usará o logotipo principal da empresa.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label>Imagem de Fundo</Label>
                    <div className="flex items-end gap-6">
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        {loginBgPreview ? (
                          <img
                            src={loginBgPreview}
                            alt="Background Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground text-center p-2">
                            Sem imagem
                          </span>
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
                                setLoginBgFile(e.target.files[0])
                                setLoginBgPreview(URL.createObjectURL(e.target.files[0]))
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex flex-col gap-2">
                        {loginBgPreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLoginBgFile(null)
                              setLoginBgPreview('')
                            }}
                          >
                            Remover
                          </Button>
                        )}
                        <div className="text-sm text-muted-foreground max-w-[200px]">
                          Utilizada para definir o background principal da tela.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Template da Tela</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                      className={cn(
                        'border-2 rounded-xl p-4 cursor-pointer transition-all',
                        loginTemplate === 'default'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-primary/50',
                      )}
                      onClick={() => setLoginTemplate('default')}
                    >
                      <div className="font-medium mb-1">Padrão</div>
                      <div className="text-xs text-muted-foreground">
                        Card centralizado em fundo claro. Layout original do sistema.
                      </div>
                    </div>
                    <div
                      className={cn(
                        'border-2 rounded-xl p-4 cursor-pointer transition-all',
                        loginTemplate === 'split'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-primary/50',
                      )}
                      onClick={() => setLoginTemplate('split')}
                    >
                      <div className="font-medium mb-1">Tela Dividida</div>
                      <div className="text-xs text-muted-foreground">
                        Formulário em uma lateral e imagem de destaque na outra.
                      </div>
                    </div>
                    <div
                      className={cn(
                        'border-2 rounded-xl p-4 cursor-pointer transition-all',
                        loginTemplate === 'glass'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-primary/50',
                      )}
                      onClick={() => setLoginTemplate('glass')}
                    >
                      <div className="font-medium mb-1">Glassmorphism</div>
                      <div className="text-xs text-muted-foreground">
                        Card translúcido centralizado sobre a imagem de fundo.
                      </div>
                    </div>
                    <div
                      className={cn(
                        'border-2 rounded-xl p-4 cursor-pointer transition-all',
                        loginTemplate === 'modern-glass'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-primary/50',
                      )}
                      onClick={() => setLoginTemplate('modern-glass')}
                    >
                      <div className="font-medium mb-1">Glass Moderno</div>
                      <div className="text-xs text-muted-foreground">
                        Efeito blur aprimorado com inputs transparentes e gradientes vibrantes.
                      </div>
                    </div>
                    <div
                      className={cn(
                        'border-2 rounded-xl p-4 cursor-pointer transition-all',
                        loginTemplate === 'dark-split'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'hover:border-primary/50',
                      )}
                      onClick={() => setLoginTemplate('dark-split')}
                    >
                      <div className="font-medium mb-1">Escuro Elegante</div>
                      <div className="text-xs text-muted-foreground">
                        Modo noturno imersivo, com gradientes quentes e formulário minimalista.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveAppearance} disabled={savingAppearance}>
                  {savingAppearance ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Aparência
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button">
                      <Eye className="w-4 h-4 mr-2" />
                      Pré-visualizar Tela
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl w-[90vw] p-0 overflow-hidden border-0 gap-0">
                    <DialogHeader className="px-6 py-4 bg-white border-b shrink-0 flex flex-row items-center justify-between">
                      <DialogTitle className="text-base font-semibold">
                        Pré-visualização da Tela de Login
                      </DialogTitle>
                    </DialogHeader>
                    <div
                      className="w-full relative bg-slate-100 overflow-y-auto"
                      style={{ maxHeight: 'calc(90vh - 60px)' }}
                    >
                      {renderMockLogin()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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

              <div className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm overflow-visible">
                <div className="space-y-0.5">
                  <Label className="text-base">Permissão para Lançar Escala</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione quais colaboradores podem gerenciar (lançar/editar) o Mural de
                    Plantões. Administradores já possuem acesso total.
                  </p>
                </div>
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-auto min-h-10 py-2 font-normal hover:bg-transparent"
                      >
                        <div className="flex flex-wrap gap-1">
                          {allowedEscalaUsers.length > 0 ? (
                            allowedEscalaUsers.map((id) => {
                              const user = usersList.find((u) => u.id === id)
                              if (!user) return null
                              return (
                                <Badge variant="secondary" key={id} className="mr-1">
                                  {user.name}
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setAllowedEscalaUsers((prev) =>
                                          prev.filter((uId) => uId !== id),
                                        )
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setAllowedEscalaUsers((prev) =>
                                        prev.filter((uId) => uId !== id),
                                      )
                                    }}
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </div>
                                </Badge>
                              )
                            })
                          ) : (
                            <span className="text-muted-foreground">
                              Selecione os colaboradores...
                            </span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar colaborador..." />
                        <CommandList>
                          <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                          <CommandGroup>
                            {usersList
                              .filter((u) => u.role !== 'Admin' && u.role !== 'Gerente')
                              .map((u) => {
                                const isSelected = allowedEscalaUsers.includes(u.id)
                                return (
                                  <CommandItem
                                    key={u.id}
                                    value={u.name}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setAllowedEscalaUsers((prev) =>
                                          prev.filter((id) => id !== u.id),
                                        )
                                      } else {
                                        setAllowedEscalaUsers((prev) => [...prev, u.id])
                                      }
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        isSelected ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    {u.name}
                                  </CommandItem>
                                )
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
