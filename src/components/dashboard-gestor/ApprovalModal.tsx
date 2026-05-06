import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isApprove: boolean
  count?: number
  onConfirm: (comment: string) => void
}

export function ApprovalModal({
  open,
  onOpenChange,
  isApprove,
  count,
  onConfirm,
}: ApprovalModalProps) {
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (open) setComment('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Aprovar' : 'Reprovar'}{' '}
            {count && count > 1 ? `${count} Solicitações` : 'Solicitação'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{isApprove ? 'Comentário (Opcional)' : 'Motivo (Obrigatório)'}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Digite aqui sua justificativa..."
              className="resize-none"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={() => onConfirm(comment)}
            disabled={!isApprove && !comment.trim()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
