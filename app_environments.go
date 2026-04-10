package main

import (
	"fmt"

	"grpc-nimbus/internal/storage"
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
		return fmt.Errorf("environment store unavailable")
	}
	return a.envStore.SaveEnvironment(env)
}

// DeleteEnvironment removes an environment by ID.
func (a *App) DeleteEnvironment(id string) error {
	if a.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	return a.envStore.DeleteEnvironment(id)
}

// SetActiveEnvironment sets the active environment by ID (empty string = no env).
func (a *App) SetActiveEnvironment(id string) error {
	if id == "" {
		a.mu.Lock()
		a.activeEnv = nil
		a.mu.Unlock()
		return nil
	}
	if a.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	env, err := a.envStore.GetEnvironment(id)
	if err != nil {
		return err
	}
	a.mu.Lock()
	a.activeEnv = env
	a.mu.Unlock()
	return nil
}
