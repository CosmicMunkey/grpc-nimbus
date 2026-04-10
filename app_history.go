package main

import (
	"fmt"

	"grpc-nimbus/internal/storage"
)

// GetHistory returns the invocation history for a given method path.
func (a *App) GetHistory(methodPath string) ([]storage.HistoryEntry, error) {
	if a.histStore == nil {
		return nil, nil
	}
	return a.histStore.GetHistory(methodPath)
}

// ClearHistory removes all history for the given method path.
func (a *App) ClearHistory(methodPath string) error {
	if a.histStore == nil {
		return fmt.Errorf("history store unavailable")
	}
	return a.histStore.ClearHistory(methodPath)
}
