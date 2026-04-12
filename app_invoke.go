package main

import (
	"context"
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// InvokeUnary executes a unary or server-streaming RPC synchronously.
// For streaming methods, all response messages are concatenated in ResponseJSON
// separated by newlines. Use InvokeStream for live events.
func (a *App) InvokeUnary(req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	env := a.activeEnv
	ctx, cancel := context.WithCancel(a.ctx)
	a.unaryCancel = cancel
	a.mu.Unlock()

	defer func() {
		cancel()
		a.mu.Lock()
		a.unaryCancel = nil
		a.mu.Unlock()
	}()

	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded — load a protoset or use reflection")
	}

	// Apply environment variable interpolation.
	req = interpolateRequest(req, env)

	resp, err := rpc.InvokeUnary(ctx, conn, pd, req)
	if err != nil {
		return nil, err
	}

	// Record to history.
	if a.histStore != nil {
		_ = a.histStore.Add(storage.HistoryEntry{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			MethodPath:  req.MethodPath,
			RequestJSON: req.RequestJSON,
			Metadata:    req.Metadata,
			Response:    resp,
			InvokedAt:   time.Now().Format(time.RFC3339Nano),
		})
	}
	return resp, nil
}

// CancelUnary aborts the currently in-flight unary invocation.
func (a *App) CancelUnary() {
	a.mu.Lock()
	cancel := a.unaryCancel
	a.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// InvokeStream starts a streaming RPC and emits Wails events for each message.
// Events are emitted on the channel "stream:event" with a StreamEvent payload.
// Call CancelStream to abort.
func (a *App) InvokeStream(req rpc.InvokeRequest) error {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	env := a.activeEnv
	// Cancel any running stream first.
	if a.streamCancel != nil {
		a.streamCancel()
	}
	ctx, cancel := context.WithCancel(a.ctx)
	a.streamCancel = cancel
	a.mu.Unlock()

	if conn == nil {
		cancel()
		return fmt.Errorf("not connected")
	}
	if pd == nil {
		cancel()
		return fmt.Errorf("no descriptor loaded")
	}

	req = interpolateRequest(req, env)

	go func() {
		defer cancel()
		err := rpc.InvokeStream(ctx, conn, pd, req, func(evt rpc.StreamEvent) {
			runtime.EventsEmit(a.ctx, "stream:event", evt)
		})
		if err != nil {
			runtime.EventsEmit(a.ctx, "stream:event", rpc.StreamEvent{
				Type:  "error",
				Error: err.Error(),
			})
		}
		runtime.EventsEmit(a.ctx, "stream:done", nil)
	}()
	return nil
}

// CancelStream aborts the currently running streaming RPC.
func (a *App) CancelStream() {
	a.mu.Lock()
	cancel := a.streamCancel
	a.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func interpolateRequest(req rpc.InvokeRequest, env *storage.Environment) rpc.InvokeRequest {
	if env == nil || len(env.Headers) == 0 {
		return req
	}

	// Prepend environment-level headers so per-request metadata can override.
	envMeta := make([]rpc.MetadataEntry, 0, len(env.Headers))
	for _, h := range env.Headers {
		if h.Key == "" {
			continue
		}
		envMeta = append(envMeta, rpc.MetadataEntry{
			Key:   h.Key,
			Value: h.Value,
		})
	}
	req.Metadata = append(envMeta, req.Metadata...)

	return req
}
