import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function Index() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const { signIn, resetPassword, session, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [appSettings, setAppSettings] = useState<any>({
    appName: 'Gestão RH SL Web',
    appLogo: '',
    loginSettings: {
      template: 'default',
      logoUrl: '',
      bgUrl: '',
    },
    loaded: false,
  })

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('*')
      .in('chave', ['app_name', 'app_logo', 'app_login_settings'])
      .then(({ data }) => {
        if (data) {
          const settings = { ...appSettings, loaded: true }
          data.forEach((d) => {
            if (d.chave === 'app_name') settings.appName = d.valor?.text || settings.appName
            if (d.chave === 'app_logo') settings.appLogo = d.valor?.url || ''
            if (d.chave === 'app_login_settings')
              settings.loginSettings = { ...settings.loginSettings, ...d.valor }
          })
          setAppSettings(settings)
        } else {
          setAppSettings((s: any) => ({ ...s, loaded: true }))
        }
      })
  }, [])

  useEffect(() => {
    if (session && user) {
      const from = location.state?.from?.pathname || '/app/dashboard'
      navigate(from, { replace: true })
    }
  }, [session, user, navigate, location])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isRecovering) {
      setIsLoading(true)
      try {
        const { error } = await resetPassword(email)
        if (error) throw error
        toast.success('Se o email existir, um link de recuperação foi enviado.')
        setIsRecovering(false)
      } catch (error: any) {
        toast.error('Erro ao solicitar recuperação. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/app/dashboard', { replace: true })
    } catch (error: any) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  const bgUrl = appSettings.loginSettings.bgUrl
  const logoToUse = appSettings.loginSettings.logoUrl || appSettings.appLogo
  const isDarkTemplate = appSettings.loginSettings.template === 'glass'

  const renderHeader = (isDark = false) => {
    return (
      <div className="flex flex-col items-center text-center mb-6">
        {logoToUse ? (
          <img src={logoToUse} alt="Logo" className="h-20 w-auto object-contain mb-6" />
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
          )}
        >
          {appSettings.appName}
        </h1>
        <p className={cn('mt-2', isDark ? 'text-white/80' : 'text-slate-500')}>
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>
    )
  }

  const renderForm = (isDark = false) => {
    return (
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2 text-left">
          <Label htmlFor="email" className={cn(isDark && 'text-white')}>
            Email corporativo
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu.nome@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              'h-11',
              isDark &&
                'bg-black/20 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30',
            )}
            disabled={isLoading}
          />
        </div>
        {!isRecovering && (
          <div className="space-y-2 animate-fade-in text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className={cn(isDark && 'text-white')}>
                Senha
              </Label>
              <button
                type="button"
                onClick={() => setIsRecovering(true)}
                className={cn(
                  'text-sm font-medium focus:outline-none hover:underline',
                  isDark ? 'text-white/80 hover:text-white' : 'text-primary',
                )}
              >
                Esqueceu a senha?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isRecovering}
              minLength={6}
              className={cn(
                'h-11',
                isDark &&
                  'bg-black/20 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30',
              )}
              disabled={isLoading}
            />
          </div>
        )}
        <div className="pt-4 space-y-3">
          <Button
            type="submit"
            className={cn(
              'w-full h-11 text-base',
              isDark && 'bg-white text-black hover:bg-white/90',
            )}
            disabled={isLoading}
          >
            {isLoading
              ? isRecovering
                ? 'Enviando...'
                : 'Autenticando...'
              : isRecovering
                ? 'Enviar link de recuperação'
                : 'Entrar no Sistema'}
          </Button>
          {isRecovering && (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'w-full h-11',
                isDark && 'text-white hover:bg-white/10 hover:text-white',
              )}
              onClick={() => setIsRecovering(false)}
              disabled={isLoading}
            >
              Voltar para o login
            </Button>
          )}
        </div>
      </form>
    )
  }

  if (!appSettings.loaded) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50" />
  }

  if (appSettings.loginSettings.template === 'split') {
    return (
      <div className="min-h-screen w-full flex bg-background animate-in fade-in duration-500">
        <div className="flex-1 hidden lg:flex items-center justify-center relative overflow-hidden bg-slate-900">
          {bgUrl ? (
            <img
              src={bgUrl}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-primary/20" />
          )}
          <div className="relative z-10 text-white p-12 text-center max-w-2xl"></div>
        </div>
        <div className="w-full lg:w-[500px] xl:w-[600px] flex flex-col items-center justify-center p-8 bg-white shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-20">
          <div className="w-full max-w-sm">
            {renderHeader()}
            {renderForm()}
          </div>
        </div>
      </div>
    )
  }

  if (appSettings.loginSettings.template === 'glass') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative animate-in fade-in duration-500">
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
            {renderHeader(true)}
            {renderForm(true)}
          </div>
        </div>
      </div>
    )
  }

  // Default Template
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-8">
        {renderHeader()}
        <Card className="border-0 shadow-elevation">
          <CardContent className="pt-6">{renderForm()}</CardContent>
        </Card>
      </div>
    </div>
  )
}
