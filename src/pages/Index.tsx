import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const navigate = useNavigate()

  const [appSettings, setAppSettings] = useState<any>({
    appName: 'Gestão RH SL Web',
    appLogo: '',
    loginSettings: {
      template: 'default',
      logoUrl: '',
      bgUrl: '',
    },
    loaded: true,
  })

  useEffect(() => {
    // Redirecionamento forçado de alta prioridade (ignora estados locais de loading)
    if (session && user) {
      let from = location.state?.from?.pathname || '/app/dashboard'
      if (from === '/') from = '/app/dashboard'
      navigate(from, { replace: true })
    }
  }, [session, user, navigate, location.state])

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('*')
      .in('chave', ['app_name', 'app_logo', 'app_login_settings'])
      .then(({ data, error }) => {
        if (data && !error) {
          setAppSettings((prev: any) => {
            const settings = { ...prev }
            data.forEach((d) => {
              if (d.chave === 'app_name') settings.appName = d.valor?.text || settings.appName
              if (d.chave === 'app_logo') settings.appLogo = d.valor?.url || ''
              if (d.chave === 'app_login_settings')
                settings.loginSettings = { ...settings.loginSettings, ...d.valor }
            })
            return settings
          })
        }
      })
      .catch(() => {
        // Ignored
      })
  }, [])

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
      // A navegação ocorrerá automaticamente via useEffect de alta prioridade
    } catch (error: any) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.')
      setIsLoading(false)
    }
  }

  const bgUrl = appSettings.loginSettings.bgUrl
  const logoToUse = appSettings.loginSettings.logoUrl || appSettings.appLogo
  const template = appSettings.loginSettings.template

  if (session && user) {
    return null // Previne flash da tela de login ou renders pesados durante redirecionamento
  }

  const renderHeader = (isDark = false, alignLeft = false) => {
    return (
      <div
        className={cn(
          'flex flex-col mb-6 sm:mb-8',
          alignLeft ? 'items-start text-left' : 'items-center text-center',
        )}
      >
        {logoToUse ? (
          <img
            src={logoToUse}
            alt="Logo"
            className={cn('h-12 sm:h-16 w-auto object-contain mb-4 sm:mb-6', alignLeft && 'ml-0')}
          />
        ) : (
          <div
            className={cn(
              'w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg',
              isDark ? 'bg-white/20 shadow-black/20' : 'bg-primary shadow-primary/20',
            )}
          >
            <Building2
              className={cn(
                'w-6 h-6 sm:w-8 sm:h-8',
                isDark ? 'text-white' : 'text-primary-foreground',
              )}
            />
          </div>
        )}
        <h1
          className={cn(
            'text-2xl sm:text-3xl font-bold tracking-tight',
            isDark ? 'text-white' : 'text-slate-900',
            template === 'dark-split' && 'text-3xl sm:text-4xl',
          )}
        >
          {template === 'dark-split' ? (
            <>
              Faça o seu login<span className="text-pink-500">.</span>
            </>
          ) : (
            appSettings.appName
          )}
        </h1>
        <p className={cn('mt-2 text-sm sm:text-base', isDark ? 'text-white/60' : 'text-slate-500')}>
          Entre com suas credenciais para acessar o sistema
        </p>
      </div>
    )
  }

  const renderForm = (isDark = false) => {
    let inputClasses = 'h-11'
    let buttonClasses = 'w-full h-11 text-base transition-all'
    let labelClasses = ''

    if (isDark) {
      inputClasses = cn(
        inputClasses,
        'bg-black/20 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30',
      )
      buttonClasses = cn(buttonClasses, 'bg-white text-black hover:bg-white/90')
      labelClasses = 'text-white'
    }

    if (template === 'modern-glass') {
      inputClasses =
        'h-12 bg-transparent border-0 border-b-2 border-white/30 rounded-none px-2 focus-visible:ring-0 focus-visible:border-white text-white placeholder:text-white/50 transition-colors'
      buttonClasses =
        'w-full h-12 text-base rounded-full bg-gradient-to-r from-[#4A00E0] to-[#8E2DE2] text-white hover:opacity-90 border-0 shadow-lg hover:shadow-[#8E2DE2]/25'
      labelClasses = 'text-white/80 text-sm font-normal'
    } else if (template === 'dark-split') {
      inputClasses =
        'h-12 sm:h-14 bg-[#1e1e24] border-0 text-white rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-pink-500 placeholder:text-white/40'
      buttonClasses =
        'w-full h-12 sm:h-14 text-base rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold hover:opacity-90 border-0 shadow-lg hover:shadow-pink-500/25'
      labelClasses = 'text-white/70 text-sm font-normal mb-1'
    }

    return (
      <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
        <div className="space-y-1.5 sm:space-y-2 text-left">
          <Label htmlFor="email" className={labelClasses}>
            {template === 'dark-split' ? 'email' : 'Email corporativo'}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={template === 'dark-split' ? '' : 'seu.nome@empresa.com.br'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClasses}
            disabled={isLoading}
          />
        </div>
        {!isRecovering && (
          <div className="space-y-1.5 sm:space-y-2 animate-fade-in text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className={labelClasses}>
                {template === 'dark-split' ? 'senha' : 'Senha'}
              </Label>
              {template !== 'dark-split' && (
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
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder={template === 'dark-split' ? '' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isRecovering}
              minLength={6}
              className={inputClasses}
              disabled={isLoading}
            />
            {template === 'dark-split' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="text-sm font-medium text-white/60 hover:text-white focus:outline-none hover:underline"
                >
                  esqueci minha senha
                </button>
              </div>
            )}
          </div>
        )}
        <div className="pt-2 space-y-2 sm:space-y-3">
          <Button type="submit" className={buttonClasses} disabled={isLoading}>
            {isLoading
              ? isRecovering
                ? 'Enviando...'
                : 'Autenticando...'
              : isRecovering
                ? 'Enviar link de recuperação'
                : 'Entrar'}
          </Button>
          {isRecovering && (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'w-full',
                template === 'dark-split'
                  ? 'h-12 sm:h-14 text-white/60 hover:text-white hover:bg-white/5'
                  : 'h-11',
                isDark &&
                  template !== 'dark-split' &&
                  'text-white hover:bg-white/10 hover:text-white',
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

  if (template === 'split') {
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
        <div className="w-full lg:w-[500px] xl:w-[600px] flex flex-col items-center justify-center p-6 sm:p-8 bg-white shadow-none sm:shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] z-20 min-h-screen">
          <div className="w-full max-w-sm">
            {renderHeader()}
            {renderForm()}
          </div>
        </div>
      </div>
    )
  }

  if (template === 'glass') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative animate-in fade-in duration-500">
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
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 rounded-2xl shadow-2xl text-white">
            {renderHeader(true)}
            {renderForm(true)}
          </div>
        </div>
      </div>
    )
  }

  if (template === 'modern-glass') {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative animate-in fade-in duration-500"
        style={{
          background: bgUrl
            ? `url(${bgUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, #2a0845 0%, #6441A5 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white">
            {renderHeader(true)}
            {renderForm(true)}
          </div>
        </div>
      </div>
    )
  }

  if (template === 'dark-split') {
    return (
      <div className="min-h-screen w-full flex bg-[#0A0A0B] animate-in fade-in duration-500">
        <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center p-6 sm:p-12 md:p-20 z-20 min-h-screen">
          <div className="w-full max-w-md mx-auto">
            {renderHeader(true, true)}
            {renderForm(true)}
          </div>
        </div>
        <div className="flex-1 hidden lg:flex relative overflow-hidden bg-[#121214]">
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

  // Default Template
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {renderHeader()}
        <Card className="border-0 shadow-elevation">
          <CardContent className="pt-6">{renderForm()}</CardContent>
        </Card>
      </div>
    </div>
  )
}
