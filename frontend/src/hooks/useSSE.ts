import { useEffect, useRef } from 'react'
import type { LogEvent } from '../types'

const SSE_URL = '/__ditto__/events'

export function useSSE(
  onEvent: (event: LogEvent) => void,
  onConnect: () => void,
  onDisconnect: () => void,
  onReconnect: () => void,
) {
  const onEventRef = useRef(onEvent)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  const onReconnectRef = useRef(onReconnect)

  onEventRef.current = onEvent
  onConnectRef.current = onConnect
  onDisconnectRef.current = onDisconnect
  onReconnectRef.current = onReconnect

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let hasConnectedBefore = false

    function connect() {
      es = new EventSource(SSE_URL)

      es.onopen = () => {
        onConnectRef.current()
        if (hasConnectedBefore) {
          onReconnectRef.current()
        }
        hasConnectedBefore = true
      }

      es.onmessage = (e) => {
        const event: LogEvent = JSON.parse(e.data)
        onEventRef.current(event)
      }

      es.onerror = () => {
        onDisconnectRef.current()
        es?.close()
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])
}
