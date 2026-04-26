import { cn } from '@/lib/utils'
import { Info, Minus, Plus, MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export const UnitInput = ({ value, onChange, className, readOnly, title }: any) => {
  const handleDecrement = () => {
    if (readOnly) return
    const current = parseInt(value) || 0
    if (current > 0) onChange({ target: { value: String(current - 1) } })
  }

  const handleIncrement = () => {
    if (readOnly) return
    const current = parseInt(value) || 0
    onChange({ target: { value: String(current + 1) } })
  }

  return (
    <div
      className={cn(
        'flex w-[84px] items-center h-8 rounded border border-slate-200 bg-white overflow-hidden transition-all focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/50',
        className,
      )}
      title={title}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={readOnly || value <= 0}
        className="flex h-full w-7 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min="0"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className="flex-1 w-full h-full bg-transparent text-center text-xs font-medium text-slate-700 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={readOnly}
        className="flex h-full w-7 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

export const InfoTooltip = ({
  title,
  items,
  emptyText,
}: {
  title: string
  items?: string[]
  emptyText?: string
}) => {
  if (!items) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-blue-500 cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-[220px]">
        <p className="font-semibold mb-1 border-b pb-1">{title}</p>
        {items.length > 0 ? (
          <ul className="list-disc pl-3 space-y-0.5">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground italic">{emptyText || 'Nenhum registro'}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export const FieldWithInfo = ({
  value,
  onChange,
  readOnly,
  title,
  items,
  emptyText,
  multiplier,
  type,
  isWarning,
}: any) => {
  const isDeduction = type === 'deduction'
  return (
    <div className="flex flex-col gap-1 items-center">
      <UnitInput
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={cn(
          isWarning && 'border-orange-300 bg-orange-50',
          readOnly && 'bg-slate-50 border-slate-200 opacity-80',
        )}
      />
      <div className="flex w-[84px] justify-between items-center px-1">
        <span
          className={cn(
            'text-[10px] font-medium',
            isDeduction ? 'text-red-600' : 'text-emerald-600',
          )}
        >
          {isDeduction ? '-' : '+'}R$ {((value || 0) * multiplier).toFixed(2).replace('.', ',')}
        </span>
        <div className="flex items-center gap-1">
          {isWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-orange-500 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Alterado manualmente</p>
              </TooltipContent>
            </Tooltip>
          )}
          {items && <InfoTooltip title={title} items={items} emptyText={emptyText} />}
        </div>
      </div>
    </div>
  )
}

export const AdjustmentInput = ({
  value,
  justification,
  onChange,
  title,
  type,
  multiplier,
}: any) => {
  const isCredit = type === 'credito'
  return (
    <div className="flex flex-col gap-1 items-center">
      <UnitInput
        value={value || 0}
        onChange={(e: any) => onChange(e.target.value, justification)}
        className={isCredit ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}
      />
      <div className="flex w-[84px] justify-between items-center px-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-[10px] font-medium cursor-help border-b border-dashed',
                isCredit ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300',
              )}
            >
              {isCredit ? '+' : '-'}R$ {((value || 0) * multiplier).toFixed(2).replace('.', ',')}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px] text-xs">
            {justification ? (
              <p>{justification}</p>
            ) : (
              <p className="text-muted-foreground italic">Sem justificativa</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'shrink-0 transition-colors',
                justification
                  ? isCredit
                    ? 'text-emerald-500'
                    : 'text-red-500'
                  : 'text-slate-300 hover:text-slate-500',
              )}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 z-50">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{title}</Label>
              <Textarea
                value={justification || ''}
                onChange={(e) => onChange(value, e.target.value)}
                placeholder="Motivo em dias..."
                className="text-xs min-h-[60px]"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
