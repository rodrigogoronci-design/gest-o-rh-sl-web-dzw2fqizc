import { Input } from '@/components/ui/input'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImportBox({
  title,
  id,
  onPreview,
  isImported,
}: {
  title: string
  id: string
  onPreview: (f: File, title: string, id: string) => void
  isImported: boolean
}) {
  return (
    <div
      className={cn(
        'border rounded-lg p-3 flex flex-col gap-2 bg-white shadow-sm transition-colors',
        isImported ? 'border-green-300 bg-green-50/30' : 'hover:border-primary/50',
      )}
    >
      <label htmlFor={id} className="font-medium text-xs text-slate-700 line-clamp-1" title={title}>
        {title}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="text-[10px] h-8 px-2 py-1 file:text-[10px] file:font-medium file:text-slate-600 file:border-0 file:bg-transparent file:mr-2 cursor-pointer flex-1"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onPreview(e.target.files[0], title, id)
              e.target.value = ''
            }
          }}
        />
        {isImported && (
          <div
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-green-600 text-white"
            title="Importado com sucesso"
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )
}
