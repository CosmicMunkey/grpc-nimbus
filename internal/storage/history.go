package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"grpc-nimbus/internal/rpc"
)

const maxHistoryPerMethod = 50

// HistoryEntry is a single recorded invocation.
type HistoryEntry struct {
	ID          string              `json:"id"`
	MethodPath  string              `json:"methodPath"`
	RequestJSON string              `json:"requestJson"`
	Metadata    []rpc.MetadataEntry `json:"metadata"`
	Response    *rpc.InvokeResponse `json:"response,omitempty"`
	InvokedAt   string              `json:"invokedAt"`
}

// HistoryStore manages per-method request/response history on disk.
type HistoryStore struct {
	dir string
	mu  sync.Mutex
}

// NewHistoryStore creates a HistoryStore backed by the OS user config directory.
func NewHistoryStore() (*HistoryStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("locating config dir: %w", err)
	}
	dir := filepath.Join(configDir, appDirName, "history")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating history dir: %w", err)
	}
	return &HistoryStore{dir: dir}, nil
}

// Add appends an entry to the history for its method, capping at maxHistoryPerMethod.
func (s *HistoryStore) Add(entry HistoryEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, err := s.getHistoryLocked(entry.MethodPath)
	if err != nil {
		return fmt.Errorf("reading history: %w", err)
	}
	entries := append([]HistoryEntry{entry}, existing...)
	if len(entries) > maxHistoryPerMethod {
		entries = entries[:maxHistoryPerMethod]
	}
	return s.writeLocked(entry.MethodPath, entries)
}

// GetHistory returns the history entries for a given method path (newest first).
func (s *HistoryStore) GetHistory(methodPath string) ([]HistoryEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.getHistoryLocked(methodPath)
}

func (s *HistoryStore) getHistoryLocked(methodPath string) ([]HistoryEntry, error) {
	path := s.filePath(methodPath)
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var entries []HistoryEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

// ClearHistory deletes all history for a method path.
func (s *HistoryStore) ClearHistory(methodPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := s.filePath(methodPath)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *HistoryStore) writeLocked(methodPath string, entries []HistoryEntry) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	path := s.filePath(methodPath)
	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".*.tmp")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
		return err
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}
	return nil
}

func (s *HistoryStore) filePath(methodPath string) string {
	// Sanitize method path for use as a filename: replace / and . with _
	safe := sanitize(methodPath)
	return filepath.Join(s.dir, safe+".json")
}

func sanitize(s string) string {
	out := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '/' || c == '.' || c == ' ' {
			out[i] = '_'
		} else {
			out[i] = c
		}
	}
	return string(out)
}
