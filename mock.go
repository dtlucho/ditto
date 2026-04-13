package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Mock struct {
	Method  string            `json:"method"`
	Path    string            `json:"path"`
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    json.RawMessage   `json:"body"`
	RawBody []byte
	DelayMs int               `json:"delay_ms"`
}

func LoadMocks(dir string) ([]Mock, error) {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil, nil
	}

	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		return nil, err
	}

	var mocks []Mock
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", file, err)
		}

		var mock Mock
		if err := json.Unmarshal(data, &mock); err != nil {
			return nil, fmt.Errorf("parsing %s: %w", file, err)
		}

		if mock.Method == "" || mock.Path == "" {
			return nil, fmt.Errorf("%s: method and path are required", file)
		}
		if mock.Status == 0 {
			mock.Status = 200
		}

		mock.RawBody = []byte(mock.Body)
		mocks = append(mocks, mock)
	}

	return mocks, nil
}

func FindMock(mocks []Mock, method, path string) *Mock {
	for i := range mocks {
		if strings.EqualFold(mocks[i].Method, method) && matchPath(mocks[i].Path, path) {
			return &mocks[i]
		}
	}
	return nil
}

// matchPath supports exact matches and simple wildcards.
// Example: /api/v1/users/* matches /api/v1/users/123
func matchPath(pattern, path string) bool {
	if pattern == path {
		return true
	}

	patternParts := strings.Split(pattern, "/")
	pathParts := strings.Split(path, "/")

	if len(patternParts) != len(pathParts) {
		return false
	}

	for i := range patternParts {
		if patternParts[i] == "*" {
			continue
		}
		if patternParts[i] != pathParts[i] {
			return false
		}
	}

	return true
}
