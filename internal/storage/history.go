package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"grpc-nimbus/internal/rpc"
)

const maxHistoryPerMethod = 50

// HistoryEntry is a single recorded invocation.
type HistoryEntry struct {
	ID          string               `json:"id"`
	MethodPath  string               `json:"methodPath"`
	RequestJSON string               `json:"requestJson"`
	Metadata    []rpc.MetadataEntry  `json:"metadata"`
	Response    *rpc.InvokeResponse  `json:"response,omitempty"`
	InvokedAt   time.Time            `json:"invokedAt"`
}

// HistoryStore manages per-method request/response history on disk.
type HistoryStore struct {
	dir string
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
	existing, _ := s.GetHistory(entry.MethodPath)
	entries := append([]HistoryEntry{entry}, existing...)
	if len(entries) > maxHistoryPerMethod {
		entries = entries[:maxHistoryPerMethod]
	}
	return s.write(entry.MethodPath, entries)
}

// GetHistory returns the history entries for a given method path (newest first).
func (s *HistoryStore) GetHistory(methodPath string) ([]HistoryEntry, error) {
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
	path := s.filePath(methodPath)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *HistoryStore) write(methodPath string, entries []HistoryEntry) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath(methodPath), data, 0o644)
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
