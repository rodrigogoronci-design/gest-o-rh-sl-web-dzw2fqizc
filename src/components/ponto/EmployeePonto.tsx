import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getDeviceId } from '@/lib/device-utils'
import { DeviceAuthFlow } from './DeviceAuthFlow'
import { PontoPunch } from './PontoPunch'
import { Skeleton } from '@/components/ui/skeleton'

export function EmployeePonto({ colaborador }: { colaborador: any }) {
  const [deviceStatus, setDeviceStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const deviceId = getDeviceId()

  useEffect(() => {
    if (!colaborador) return
    const fetchDevice = async () => {
      const { data } = await supabase
        .from('dispositivos_autorizados')
        .select('*')
        .eq('device_id_hash', deviceId)
        .maybeSingle()

      setDeviceStatus(data)
      setLoading(false)
    }
    fetchDevice()
  }, [colaborador, deviceId])

  if (loading) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!deviceStatus || deviceStatus.status !== 'aprovado') {
    return (
      <DeviceAuthFlow
        colaborador={colaborador}
        deviceStatus={deviceStatus}
        onUpdate={setDeviceStatus}
      />
    )
  }

  return <PontoPunch colaborador={colaborador} deviceId={deviceId} />
}
