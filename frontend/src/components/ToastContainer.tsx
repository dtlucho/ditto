import type { Toast } from '../types'

interface ToastContainerProps {
  toasts: Toast[]
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`fixed bottom-[30px] left-1/2 -translate-x-1/2 bg-dt-surface border text-dt-text px-4 py-2.5 rounded-lg text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-[200] toast-enter ${
            toast.kind === 'warn' ? 'border-dt-orange text-dt-orange' : 'border-dt-border'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </>
  )
}
