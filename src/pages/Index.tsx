import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'

export default function Index() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const { signIn, resetPassword, session, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão RH SL Web</h1>
          <p className="text-slate-500 mt-2">Entre com suas credenciais para acessar o sistema</p>
        </div>

        <Card className="border-0 shadow-elevation">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  disabled={isLoading}
                />
              </div>
              {!isRecovering && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setIsRecovering(true)}
                      className="text-sm font-medium text-primary hover:underline focus:outline-none"
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
                    className="h-11"
                    disabled={isLoading}
                  />
                </div>
              )}
              <div className="pt-2 space-y-3">
                <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
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
                    className="w-full h-11"
                    onClick={() => setIsRecovering(false)}
                    disabled={isLoading}
                  >
                    Voltar para o login
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
