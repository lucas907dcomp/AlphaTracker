import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, isLoading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="text-slate-400 text-sm">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" disabled={isLoading} onClick={onConfirm}>
            {isLoading ? '...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
