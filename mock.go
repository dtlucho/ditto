package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type Mock struct {
	Method  string            `json:"method"`
	Path    string            `json:"path"`
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    json.RawMessage   `json:"body"`
	RawBody []byte            `json:"-"`
	DelayMs int               `json:"delay_ms"`
	Enabled bool              `json:"enabled"`
	Source  string            `json:"source"`
}

type MockStore struct {
	mu    sync.RWMutex
	mocks []Mock
	dir   string
}

func NewMockStore(dir string) *MockStore {
	return &MockStore{dir: dir}
}

func (s *MockStore) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	mocks, err := loadMocksFromDir(s.dir)
	if err != nil {
		return err
	}
	s.mocks = mocks
	return nil
}

func (s *MockStore) Find(method, path string) *Mock {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for i := range s.mocks {
		if !s.mocks[i].Enabled {
			continue
		}
		if strings.EqualFold(s.mocks[i].Method, method) && matchPath(s.mocks[i].Path, path) {
			return &s.mocks[i]
		}
	}
	return nil
}

func (s *MockStore) All() []Mock {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Mock, len(s.mocks))
	copy(result, s.mocks)
	return result
}

func (s *MockStore) Toggle(index int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if index < 0 || index >= len(s.mocks) {
		return false
	}
	s.mocks[index].Enabled = !s.mocks[index].Enabled
	return true
}

func (s *MockStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.mocks)
}

func (s *MockStore) Create(mock Mock) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if mock.Method == "" || mock.Path == "" {
		return fmt.Errorf("method and path are required")
	}
	if mock.Status == 0 {
		mock.Status = 200
	}
	mock.RawBody = []byte(mock.Body)
	mock.Enabled = true

	// Generate filename from method + path
	if mock.Source == "" {
		mock.Source = generateFilename(mock.Method, mock.Path)
	}

	// Write to disk
	if err := writeMockFile(s.dir, mock); err != nil {
		return err
	}

	s.mocks = append(s.mocks, mock)
	return nil
}

func (s *MockStore) Update(index int, mock Mock) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if index < 0 || index >= len(s.mocks) {
		return fmt.Errorf("mock not found")
	}
	if mock.Method == "" || mock.Path == "" {
		return fmt.Errorf("method and path are required")
	}
	if mock.Status == 0 {
		mock.Status = 200
	}
	mock.RawBody = []byte(mock.Body)
	mock.Enabled = s.mocks[index].Enabled

	// Keep existing filename or generate new one
	oldSource := s.mocks[index].Source
	if mock.Source == "" {
		mock.Source = oldSource
	}

	// If source changed, remove old file
	if mock.Source != oldSource {
		os.Remove(filepath.Join(s.dir, oldSource))
	}

	if err := writeMockFile(s.dir, mock); err != nil {
		return err
	}

	s.mocks[index] = mock
	return nil
}

func (s *MockStore) Delete(index int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if index < 0 || index >= len(s.mocks) {
		return fmt.Errorf("mock not found")
	}

	// Remove file from disk
	filePath := filepath.Join(s.dir, s.mocks[index].Source)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("deleting %s: %w", filePath, err)
	}

	// Remove from slice
	s.mocks = append(s.mocks[:index], s.mocks[index+1:]...)
	return nil
}

func generateFilename(method, path string) string {
	clean := strings.ReplaceAll(path, "/", "_")
	clean = strings.TrimPrefix(clean, "_")
	if clean == "" {
		clean = "root"
	}
	name := fmt.Sprintf("%s_%s.json", strings.ToLower(method), clean)
	return name
}

func writeMockFile(dir string, mock Mock) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating mocks dir: %w", err)
	}

	fileData := struct {
		Method  string            `json:"method"`
		Path    string            `json:"path"`
		Status  int               `json:"status"`
		Headers map[string]string `json:"headers,omitempty"`
		Body    json.RawMessage   `json:"body"`
		DelayMs int               `json:"delay_ms,omitempty"`
	}{
		Method:  mock.Method,
		Path:    mock.Path,
		Status:  mock.Status,
		Headers: mock.Headers,
		Body:    mock.Body,
		DelayMs: mock.DelayMs,
	}

	data, err := json.MarshalIndent(fileData, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling mock: %w", err)
	}

	filePath := filepath.Join(dir, mock.Source)
	return os.WriteFile(filePath, data, 0o644)
}

func loadMocksFromDir(dir string) ([]Mock, error) {
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
		mock.Enabled = true
		mock.Source = filepath.Base(file)
		mocks = append(mocks, mock)
	}

	return mocks, nil
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
