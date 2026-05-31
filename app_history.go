package main

import (
	"fmt"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
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
		logger.Default.Errorf("clear history %s failed: history store unavailable", methodPath)
		return fmt.Errorf("history store unavailable")
	}
	if err := a.histStore.ClearHistory(methodPath); err != nil {
		logger.Default.Errorf("clear history %s failed: %v", methodPath, err)
		return err
	}
	return nil
}
