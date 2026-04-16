import type { UpdateInfo } from '../types'

interface UpdateBannerProps {
  info: UpdateInfo
  onDismiss: () => void
}

export function UpdateBanner({ info, onDismiss }: UpdateBannerProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    // Open in system browser (works both in Wails and regular browser)
    window.open(info.download_url, '_blank')
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2 bg-[rgba(88,166,255,0.1)] border-b border-[rgba(88,166,255,0.2)] text-[13px]">
      <span className="flex-1 text-dt-text">
        Ditto {info.latest} is available (you have {info.current}).
      </span>
      <a
        href={info.download_url}
        onClick={handleDownload}
        className="text-dt-accent font-semibold no-underline hover:underline cursor-pointer"
      >
        Download
      </a>
      <button
        onClick={onDismiss}
        className="bg-transparent border-none text-dt-muted cursor-pointer text-xs px-1.5 py-0.5 hover:text-dt-text"
      >
        Dismiss
      </button>
    </div>
  )
}
