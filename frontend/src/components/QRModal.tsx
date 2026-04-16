import { useEffect, useRef, useCallback } from 'react'
import * as api from '../api'

interface QRModalProps {
  onClose: () => void
}

export function QRModal({ onClose }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const urlRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    api.fetchQR().then(async ({ blob, url }) => {
      const img = await createImageBitmap(blob)
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      if (urlRef.current) urlRef.current.textContent = url
    }).catch(err => {
      console.error('Failed to generate QR code:', err)
    })
  }, [])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
    >
      <div onClick={e => e.stopPropagation()} className="bg-dt-surface border border-dt-border rounded-xl w-[340px] overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-dt-border">
          <h3 className="text-base font-semibold">Open on your phone</h3>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-dt-muted text-[22px] cursor-pointer px-1 hover:text-dt-text"
          >
            &times;
          </button>
        </div>
        <div className="p-5 text-center">
          <p className="text-[13px] text-dt-muted mb-4 leading-relaxed">
            Scan this QR code with your phone camera to open the Ditto dashboard.
          </p>
          <canvas ref={canvasRef} className="rounded-lg bg-white p-3" />
          <p ref={urlRef} className="font-mono text-[11px] text-dt-accent mt-4 break-all" />
        </div>
      </div>
    </div>
  )
}
