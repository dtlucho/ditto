import { useCallback } from 'react'
import * as api from '../api'

interface HeaderProps {
  version: string
  connected: boolean
  isDesktop: boolean
  isMobile: boolean
  onReloadMocks: () => void
  onClearLog: () => void
  onShowQR: () => void
  onToggleSidebar: () => void
}

export function Header({
  version,
  connected,
  isDesktop,
  isMobile,
  onReloadMocks,
  onClearLog,
  onShowQR,
  onToggleSidebar,
}: HeaderProps) {
  const handleOpenBrowser = useCallback(() => {
    api.openInBrowser()
  }, [])

  const showBrowserBtn = isDesktop
  const showQRBtn = !isMobile

  return (
    <header className="flex justify-between items-center px-5 py-3 border-b border-dt-border bg-dt-surface">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden bg-transparent border-none text-dt-text text-xl cursor-pointer px-1.5 py-0.5"
          onClick={onToggleSidebar}
        >
          &#9776;
        </button>
        <h1 className="text-base font-bold tracking-widest text-dt-accent">DITTO</h1>
        {version && (
          <span className="text-[11px] text-dt-muted font-normal">{version}</span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-xl font-medium ${
            connected
              ? 'bg-[rgba(63,185,80,0.15)] text-dt-green'
              : 'bg-[rgba(248,81,73,0.15)] text-dt-red'
          }`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex gap-2">
        {showBrowserBtn && (
          <button
            onClick={handleOpenBrowser}
            title="Open dashboard in browser"
            className="btn"
          >
            Browser
          </button>
        )}
        {showQRBtn && (
          <button
            onClick={onShowQR}
            title="Scan to open on your phone"
            className="btn"
          >
            QR Code
          </button>
        )}
        <button onClick={onReloadMocks} className="btn">
          Reload Mocks
        </button>
        <button onClick={onClearLog} className="btn">
          Clear Log
        </button>
      </div>
    </header>
  )
}
