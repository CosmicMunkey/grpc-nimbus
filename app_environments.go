package main

import (
	"fmt"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
)

// ListEnvironments returns all stored environments.
func (a *App) ListEnvironments() ([]storage.Environment, error) {
	if a.envStore == nil {
		return nil, nil
	}
	return a.envStore.ListEnvironments()
}

// SaveEnvironment creates or updates an environment.
func (a *App) SaveEnvironment(env storage.Environment) error {
	if a.envStore == nil {
		logger.Default.Errorf("save environment %q failed: store unavailable", env.Name)
		return fmt.Errorf("environment store unavailable")
	}
	logger.Default.Infof("saving environment %q", env.Name)
	if err := a.envStore.SaveEnvironment(env); err != nil {
		logger.Default.Errorf("save environment %q failed: %v", env.Name, err)
		return err
	}
	// If this is the active environment, refresh the in-memory copy so that
	// subsequent RPCs pick up any header/target changes immediately.
	a.mu.Lock()
	if a.activeEnv != nil && a.activeEnv.ID == env.ID {
		a.activeEnv = &env
	}
	a.mu.Unlock()
	return nil
}

// DeleteEnvironment removes an environment by ID.
func (a *App) DeleteEnvironment(id string) error {
	if a.envStore == nil {
		logger.Default.Errorf("delete environment %s failed: store unavailable", id)
		return fmt.Errorf("environment store unavailable")
	}
	logger.Default.Infof("deleting environment %s", id)
	if err := a.envStore.DeleteEnvironment(id); err != nil {
		logger.Default.Errorf("delete environment %s failed: %v", id, err)
		return err
	}
	return nil
}

// SetActiveEnvironment sets the active environment by ID (empty string = no env).
func (a *App) SetActiveEnvironment(id string) error {
	if id == "" {
		a.mu.Lock()
		a.activeEnv = nil
		a.mu.Unlock()
		logger.Default.Infof("cleared active environment")
		a.saveSettings(func(s *storage.AppSettings) {
			s.ActiveEnvironmentID = ""
		})
		return nil
	}
	if a.envStore == nil {
		logger.Default.Errorf("set active environment %s failed: store unavailable", id)
		return fmt.Errorf("environment store unavailable")
	}
	env, err := a.envStore.GetEnvironment(id)
	if err != nil {
		logger.Default.Errorf("set active environment %s failed: %v", id, err)
		return err
	}
	a.mu.Lock()
	a.activeEnv = env
	a.mu.Unlock()
	logger.Default.Infof("active environment set to %q", env.Name)
	a.saveSettings(func(s *storage.AppSettings) {
		s.ActiveEnvironmentID = id
	})
	return nil
}
