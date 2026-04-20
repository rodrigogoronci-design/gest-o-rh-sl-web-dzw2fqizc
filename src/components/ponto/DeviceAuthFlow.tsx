import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getDeviceId, getDeviceType } from '@/lib/device-utils'
import { toast } from 'sonner'

export function DeviceAuthFlow({ colaborador, deviceStatus, onUpdate }: any) {
  const requestAuth = async () => {
    const deviceId = getDeviceId()
    const { data, error } = await supabase
      .from('dispositivos_autorizados')
      .insert({
        colaborador_id: colaborador.id,
        device_id_hash: deviceId,
        tipo: getDeviceType(),
        status: 'pendente',
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao solicitar autorização. Verifique sua conexão.')
    } else {
      toast.success('Solicitação enviada com sucesso!')
      onUpdate(data)
    }
  }

  return (
    <Card className="max-w-md mx-auto text-center shadow-lg border-t-4 border-t-amber-500">
      <CardHeader>
        <CardTitle className="flex justify-center items-center gap-2">
          {deviceStatus?.status === 'bloqueado' ? (
            <ShieldAlert className="text-destructive w-6 h-6" />
          ) : (
            <ShieldCheck className="text-amber-500 w-6 h-6" />
          )}
          Dispositivo Não Autorizado
        </CardTitle>
        <CardDescription>
          Para sua segurança, este sistema requer que o dispositivo seja autorizado por um
          administrador antes de registrar o ponto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!deviceStatus ? (
          <Button onClick={requestAuth} className="w-full h-12 text-md">
            Solicitar Autorização Deste Dispositivo
          </Button>
        ) : deviceStatus.status === 'pendente' ? (
          <div className="bg-amber-50 text-amber-700 p-4 rounded-xl font-medium border border-amber-100 shadow-sm">
            Seu dispositivo está aguardando a aprovação do administrador. Por favor, aguarde.
          </div>
        ) : (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl font-medium border border-destructive/20 shadow-sm">
            Este dispositivo foi bloqueado e não pode ser utilizado para registros.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
