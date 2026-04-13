# Ditto

A lightweight local proxy that lets you mock API responses without touching your app's code.

Drop a JSON file in the `mocks/` folder, start Ditto, and point your app to it. Requests that match a mock get a fake response instantly. Everything else is forwarded to your real backend.

## Install

Requires [Go](https://go.dev/dl/) 1.21+.

```bash
git clone https://github.com/dtlucho/ditto.git
cd ditto
go build -o ditto .
```

## Usage

```bash
# Mock only (unmatched requests return 502)
./ditto

# Mock + proxy to a real backend
./ditto --target https://api.example.com

# Custom port and mocks directory
./ditto --port 9000 --mocks ./my-mocks
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8888` | Port to listen on |
| `--target` | _(none)_ | Backend URL to forward unmatched requests to |
| `--mocks` | `./mocks` | Directory containing mock JSON files |

## Creating mocks

Each `.json` file in the mocks directory defines one mock. Example:

```json
{
  "method": "GET",
  "path": "/api/v1/users",
  "status": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "users": [
      {"id": 1, "name": "John Doe"}
    ]
  },
  "delay_ms": 0
}
```

### Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `method` | Yes | — | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.) |
| `path` | Yes | — | URL path to match |
| `status` | No | `200` | HTTP status code to return |
| `headers` | No | `{"Content-Type": "application/json"}` | Response headers |
| `body` | No | — | Response body (any valid JSON) |
| `delay_ms` | No | `0` | Simulated response delay in milliseconds |

### Path wildcards

Use `*` to match any single path segment:

```json
{
  "method": "GET",
  "path": "/api/v1/users/*",
  "status": 200,
  "body": {"id": 1, "name": "John Doe"}
}
```

This matches `/api/v1/users/1`, `/api/v1/users/abc`, etc.

## How it works

```
App request ──► Ditto ──┬── Mock found? ──► Return fake response
                        │
                        └── No mock? ──► Forward to --target backend
                                         (or 502 if no target)
```

Mocks are reloaded on every request, so you can add or edit mock files without restarting Ditto.

## Using with mobile devices

Ditto binds to `0.0.0.0`, so any device on the same network can reach it.

- **Android emulator**: `http://10.0.2.2:8888`
- **iOS simulator**: `http://localhost:8888`
- **Physical device**: `http://<your-machine-ip>:8888`

## License

MIT
