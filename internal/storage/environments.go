package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// EnvHeader is a gRPC metadata entry that is sent on every request when an
// environment is active. Keys should be lowercase per gRPC convention.
type EnvHeader struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// Environment holds a named set of default headers sent on every request,
// and optionally a target host:port and TLS mode to apply when activated.
type Environment struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Target    string      `json:"target,omitempty"`
	TLS       string      `json:"tls,omitempty"`
	Headers   []EnvHeader `json:"headers,omitempty"`
	CreatedAt string      `json:"createdAt"`
	UpdatedAt string      `json:"updatedAt"`
}

// EnvStore manages environment persistence.
type EnvStore struct {
	dir string
}

// NewEnvStore creates an EnvStore backed by the OS user config directory.
func NewEnvStore() (*EnvStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("locating config dir: %w", err)
	}
	return NewEnvStoreAt(filepath.Join(configDir, appDirName, "environments"))
}

// NewEnvStoreAt creates an EnvStore using the given directory path.
func NewEnvStoreAt(dir string) (*EnvStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating environments dir: %w", err)
	}
	return &EnvStore{dir: dir}, nil
}

// ListEnvironments returns all stored environments.
func (s *EnvStore) ListEnvironments() ([]Environment, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, fmt.Errorf("reading environments dir: %w", err)
	}
	var envs []Environment
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		env, err := s.loadEnvFile(filepath.Join(s.dir, e.Name()))
		if err != nil {
			continue
		}
		envs = append(envs, *env)
	}
	return envs, nil
}

// GetEnvironment returns a single environment by ID.
func (s *EnvStore) GetEnvironment(id string) (*Environment, error) {
	return s.loadEnvFile(s.envFilePath(id))
}

// SaveEnvironment persists an environment to disk.
func (s *EnvStore) SaveEnvironment(env Environment) error {
	now := time.Now().Format(time.RFC3339Nano)
	if env.CreatedAt == "" {
		env.CreatedAt = now
	}
	env.UpdatedAt = now

	data, err := json.MarshalIndent(env, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling environment: %w", err)
	}
	path := s.envFilePath(env.ID)
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return fmt.Errorf("writing environment file: %w", err)
	}
	return os.Rename(tmp, path)
}

// DeleteEnvironment removes an environment from disk.
func (s *EnvStore) DeleteEnvironment(id string) error {
	path := s.envFilePath(id)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("removing environment file: %w", err)
	}
	return nil
}

func (s *EnvStore) envFilePath(id string) string {
	return filepath.Join(s.dir, filepath.Base(id)+".json")
}

func (s *EnvStore) loadEnvFile(path string) (*Environment, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var env Environment
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}
	return &env, nil
}
