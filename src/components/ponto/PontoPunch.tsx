import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, WifiOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { dataURLtoBlob, getDistanceFromLatLonInKm } from '@/lib/device-utils'

export function PontoPunch({ colaborador, deviceId }: any) {
  const [time, setTime] = useState(new Date())
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)

    const handleOnline = () => {
      setIsOnline(true)
      syncOffline()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setQueueCount(JSON.parse(localStorage.getItem('ponto_queue') || '[]').length)

    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => toast.error('Câmera não disponível'))

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos),
      () => toast.error('Localização não disponível. Ative o GPS.'),
      { enableHighAccuracy: true },
    )

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const syncOffline = async () => {
    const queue = JSON.parse(localStorage.getItem('ponto_queue') || '[]')
    if (queue.length === 0) return
    const failed = []
    for (const p of queue) {
      const { error } = await supabase.from('registro_ponto').insert(p)
      if (error) failed.push(p)
    }
    localStorage.setItem('ponto_queue', JSON.stringify(failed))
    setQueueCount(failed.length)
    if (failed.length < queue.length)
      toast.success(`${queue.length - failed.length} registros sincronizados!`)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    canvas.width = 480
    canvas.height = 640
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  }

  const registerPoint = async (tipo: string) => {
    if (!location) {
      toast.error('Localização é obrigatória')
      return
    }
    setLoading(true)
    try {
      const lat = location.coords.latitude
      const lng = location.coords.longitude

      let status = 'pendente'
      if (colaborador.local_trabalho_lat && colaborador.local_trabalho_lng) {
        const dist = getDistanceFromLatLonInKm(
          lat,
          lng,
          parseFloat(colaborador.local_trabalho_lat),
          parseFloat(colaborador.local_trabalho_lng),
        )
        if (dist > 0.05) status = 'inconsistencia'
      }

      let foto_url = null
      const dataUrl = capturePhoto()

      if (isOnline && dataUrl) {
        const blob = dataURLtoBlob(dataUrl)
        const fileName = `${colaborador.id}-${Date.now()}.jpg`
        const { error } = await supabase.storage.from('ponto_fotos').upload(fileName, blob)
        if (!error) {
          foto_url = supabase.storage.from('ponto_fotos').getPublicUrl(fileName).data.publicUrl
        }
      }

      const payload = {
        colaborador_id: colaborador.id,
        tipo_registro: tipo,
        latitude: lat,
        longitude: lng,
        foto_url,
        status,
        device_id_hash: deviceId,
        data_hora: new Date().toISOString(),
      }

      if (!isOnline) {
        const queue = JSON.parse(localStorage.getItem('ponto_queue') || '[]')
        queue.push(payload)
        localStorage.setItem('ponto_queue', JSON.stringify(queue))
        setQueueCount(queue.length)
        toast.success('Salvo offline. Será sincronizado quando reconectar.')
      } else {
        const { error } = await supabase.from('registro_ponto').insert(payload)
        if (error) throw error
        toast.success('Ponto registrado com sucesso!')
      }
    } catch (e: any) {
      toast.error('Erro ao registrar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto text-center shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="flex justify-center items-center gap-2">
          <Clock className="w-5 h-5" /> Registro Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-6xl font-bold font-mono tracking-tight text-primary">
          {time.toLocaleTimeString('pt-BR')}
        </div>

        <div className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden shadow-inner border max-h-[300px] mx-auto max-w-[225px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="object-cover w-full h-full transform scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm">
              {location ? (
                <>
                  <MapPin className="w-3 h-3 text-green-500" /> GPS Ativo
                </>
              ) : (
                'Aguardando GPS...'
              )}
            </div>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg flex items-center justify-center gap-2 font-medium">
            <WifiOff className="w-4 h-4" /> Você está offline. Registros serão salvos.
          </div>
        )}
        {queueCount > 0 && isOnline && (
          <div
            className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-medium hover:bg-blue-100 transition-colors"
            onClick={syncOffline}
          >
            <RefreshCw className="w-4 h-4 animate-spin" /> {queueCount} registros pendentes. Clique
            para sincronizar.
          </div>
        )}
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 text-lg"
          onClick={() => registerPoint('entrada')}
          disabled={loading || !location}
        >
          Entrada
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-14 text-lg"
          onClick={() => registerPoint('saida')}
          disabled={loading || !location}
        >
          Saída
        </Button>
      </CardFooter>
    </Card>
  )
}
