export interface LogEvent {
  timestamp: string
  type: 'MOCK' | 'PROXY' | 'MISS'
  method: string
  path: string
  status: number
  duration_ms: number
  response_body?: string
}

export interface LogEntry extends LogEvent {
  id: string
}

export interface MockMatch {
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface Mock {
  method: string
  path: string
  status: number
  body: unknown
  delay_ms?: number
  enabled: boolean
  match?: MockMatch
}

export interface ServerInfo {
  port: number
  target: string
  https: boolean
  mocks_dir: string
  local_ips: string[]
  version: string
}

export interface MocksResponse {
  mocks: Mock[]
  info: ServerInfo
}

export interface UpdateInfo {
  current: string
  latest: string
  available: boolean
  download_url: string
}

export interface Toast {
  id: string
  message: string
  kind?: 'warn'
}
