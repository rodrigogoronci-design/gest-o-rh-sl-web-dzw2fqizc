import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HeartPulse } from 'lucide-react'

export default function PlanoSaude() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Plano de Saúde</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            Gestão de Plano de Saúde
          </CardTitle>
          <CardDescription>
            Controle e gerenciamento dos planos de saúde dos colaboradores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <HeartPulse className="w-12 h-12 mb-4 text-slate-300" />
            <p>
              A página de gestão de planos de saúde está em desenvolvimento e será disponibilizada
              em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
