import { useState, useCallback, useRef } from 'react'
import type { Toast } from '../types'

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const showToast = useCallback((message: string, kind?: 'warn') => {
    const id = String(++nextId)
    setToasts(prev => [...prev, { id, message, kind }])

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current.delete(id)
    }, 3000)
    timersRef.current.set(id, timer)
  }, [])

  return { toasts, showToast }
}
