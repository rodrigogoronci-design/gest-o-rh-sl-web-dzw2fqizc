import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAppStore from '@/stores/useAppStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Index() {
  const [email, setEmail] = useState('admin@app.com')
  const [password, setPassword] = useState('123456')
  const { login } = useAppStore()
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    login(email)
    const userRole = email.includes('admin') ? 'admin' : 'user'
    navigate(userRole === 'admin' ? '/app/usuarios' : '/app/mural')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
            CB
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Gestão de Benefícios</h2>
          <p className="text-slate-500 mt-2">Acesse sua conta para continuar</p>
        </div>

        <Card className="border-0 shadow-elevation">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Para testes, escolha um perfil abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile">Perfil de Teste</Label>
                <Select value={email} onValueChange={setEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin@app.com">Administrador (Acesso Total)</SelectItem>
                    <SelectItem value="joao@app.com">
                      Usuário Normal (Apenas Visualização)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 hidden">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg">
                Entrar no Sistema
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
