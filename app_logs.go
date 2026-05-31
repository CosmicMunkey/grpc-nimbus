package main

import "github.com/CosmicMunkey/grpc-nimbus/internal/logger"

// GetLogs returns all log entries, optionally filtered by severity.
// severity can be "info", "warn", "error", or "" / "all" for no filtering.
func (a *App) GetLogs(severity string) []logger.Entry {
	return logger.Default.GetLogs(severity)
}

// ClearLogs clears the in-memory log ring buffer.
func (a *App) ClearLogs() {
	logger.Default.Clear()
}
