package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

// version is set at build time via -ldflags "-X main.version=..."
var version = "dev"

func main() {
	port := flag.Int("port", 8888, "Port to listen on")
	target := flag.String("target", "", "Target backend URL to proxy unmatched requests")
	mocksDir := flag.String("mocks", "./mocks", "Directory containing mock JSON files")
	https := flag.Bool("https", false, "Enable HTTPS using a self-signed certificate")
	certDir := flag.String("certs", "./certs", "Directory to store the self-signed certificate")
	showVersion := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		return
	}

	mocks, err := LoadMocks(*mocksDir)
	if err != nil {
		log.Fatalf("Failed to load mocks: %v", err)
	}

	var proxy *httputil.ReverseProxy
	if *target != "" {
		targetURL, err := url.Parse(*target)
		if err != nil {
			log.Fatalf("Invalid target URL: %v", err)
		}
		proxy = httputil.NewSingleHostReverseProxy(targetURL)
		originalDirector := proxy.Director
		proxy.Director = func(req *http.Request) {
			originalDirector(req)
			req.Host = targetURL.Host
		}
		log.Printf("Proxying unmatched requests to %s", *target)
	}

	var certPath, keyPath string
	if *https {
		certPath, keyPath, err = EnsureCert(*certDir)
		if err != nil {
			log.Fatalf("Failed to prepare TLS certificate: %v", err)
		}
	}

	printStartup(mocks, *port, *target, *mocksDir, *https, certPath)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Reload mocks on every request so you can edit files without restarting
		mocks, err = LoadMocks(*mocksDir)
		if err != nil {
			log.Printf("Warning: failed to reload mocks: %v", err)
		}

		mock := FindMock(mocks, r.Method, r.URL.Path)
		if mock != nil {
			log.Printf("MOCK   %s %s → %d", r.Method, r.URL.Path, mock.Status)
			if mock.DelayMs > 0 {
				time.Sleep(time.Duration(mock.DelayMs) * time.Millisecond)
			}
			for k, v := range mock.Headers {
				w.Header().Set(k, v)
			}
			if w.Header().Get("Content-Type") == "" {
				w.Header().Set("Content-Type", "application/json")
			}
			w.WriteHeader(mock.Status)
			w.Write(mock.RawBody)
			return
		}

		if proxy != nil {
			log.Printf("PROXY  %s %s", r.Method, r.URL.Path)
			proxy.ServeHTTP(w, r)
			return
		}

		log.Printf("MISS   %s %s (no target configured)", r.Method, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "no mock found and no target configured"}`))
	})

	addr := fmt.Sprintf("0.0.0.0:%d", *port)
	if *https {
		log.Fatal(http.ListenAndServeTLS(addr, certPath, keyPath, handler))
	} else {
		log.Fatal(http.ListenAndServe(addr, handler))
	}
}

func printStartup(mocks []Mock, port int, target, mocksDir string, https bool, certPath string) {
	scheme := "http"
	if https {
		scheme = "https"
	}
	fmt.Println()
	fmt.Println("  ┌──────────────────────────────────┐")
	fmt.Printf("  │           DITTO %-16s│\n", version)
	fmt.Println("  └──────────────────────────────────┘")
	fmt.Println()
	fmt.Printf("  URL:        %s://0.0.0.0:%d\n", scheme, port)
	fmt.Printf("  Mocks dir:  %s\n", mocksDir)
	if https {
		fmt.Printf("  TLS cert:   %s\n", certPath)
	}
	if target != "" {
		fmt.Printf("  Target:     %s\n", target)
	} else {
		fmt.Printf("  Target:     (none — unmatched requests return 502)\n")
	}
	fmt.Printf("  Mocks:      %d loaded\n", len(mocks))
	fmt.Println()
	if len(mocks) > 0 {
		fmt.Println("  Registered mocks:")
		for _, m := range mocks {
			delay := ""
			if m.DelayMs > 0 {
				delay = fmt.Sprintf(" (delay: %dms)", m.DelayMs)
			}
			fmt.Printf("    %-7s %s → %d%s\n", m.Method, m.Path, m.Status, delay)
		}
		fmt.Println()
	}
	fmt.Printf("  Listening on %s://0.0.0.0:%d ...\n\n", scheme, port)
}
