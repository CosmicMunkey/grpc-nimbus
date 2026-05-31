package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// InvokeUnary executes a unary or server-streaming RPC synchronously.
// For streaming methods, all response messages are concatenated in ResponseJSON
// separated by newlines. Use InvokeStream for live events.
func (a *App) InvokeUnary(req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	env := a.activeEnv
	defaultMeta := a.defaultMetadata
	allowShell := a.allowShellCommands
	inheritEnv := a.inheritShellEnv
	emitDefaults := a.emitDefaults
	ctx, cancel := context.WithCancel(a.ctx)
	a.unaryCancelSeq++
	cancelSeq := a.unaryCancelSeq
	a.unaryCancel = cancel
	a.mu.Unlock()

	defer func() {
		cancel()
		a.mu.Lock()
		if a.unaryCancelSeq == cancelSeq {
			a.unaryCancel = nil
		}
		a.mu.Unlock()
	}()

	if conn == nil {
		logger.Default.Errorf("invoke unary %s failed: not connected", req.MethodPath)
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	if pd == nil {
		logger.Default.Errorf("invoke unary %s failed: no descriptor loaded", req.MethodPath)
		return nil, fmt.Errorf("no descriptor loaded — load a protoset or use reflection")
	}

	logger.Default.Infof("invoke unary: %s", req.MethodPath)

	// Apply environment variable interpolation.
	req = interpolateRequest(req, defaultMeta, env, allowShell, inheritEnv)
	req.EmitDefaults = emitDefaults

	resp, err := rpc.InvokeUnary(ctx, conn, pd, req)
	if err != nil {
		logger.Default.Errorf("invoke unary %s failed: %v", req.MethodPath, err)
		return nil, err
	}

	logger.Default.Infof("invoke unary %s complete: %s (%dms)", req.MethodPath, resp.Status, resp.DurationMs)

	// Record to history.
	if a.histStore != nil {
		if err := a.histStore.Add(storage.HistoryEntry{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			MethodPath:  req.MethodPath,
			RequestJSON: req.RequestJSON,
			Metadata:    req.Metadata,
			Response:    resp,
			InvokedAt:   time.Now().Format(time.RFC3339Nano),
		}); err != nil {
			logger.Default.Warnf("recording history for %s failed: %v", req.MethodPath, err)
		}
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
	defaultMeta := a.defaultMetadata
	allowShell := a.allowShellCommands
	inheritEnv := a.inheritShellEnv
	emitDefaults := a.emitDefaults
	// Cancel any running stream first.
	if a.streamCancel != nil {
		a.streamCancel()
	}
	ctx, cancel := context.WithCancel(a.ctx)
	a.streamCancelSeq++
	cancelSeq := a.streamCancelSeq
	a.streamCancel = cancel
	a.mu.Unlock()

	if conn == nil {
		cancel()
		logger.Default.Errorf("invoke stream %s failed: not connected", req.MethodPath)
		return fmt.Errorf("not connected")
	}
	if pd == nil {
		cancel()
		logger.Default.Errorf("invoke stream %s failed: no descriptor loaded", req.MethodPath)
		return fmt.Errorf("no descriptor loaded")
	}

	logger.Default.Infof("invoke stream: %s", req.MethodPath)
	req = interpolateRequest(req, defaultMeta, env, allowShell, inheritEnv)
	req.EmitDefaults = emitDefaults

	go func() {
		defer func() {
			cancel()
			a.mu.Lock()
			if a.streamCancelSeq == cancelSeq {
				a.streamCancel = nil
			}
			a.mu.Unlock()
		}()
		err := rpc.InvokeStream(ctx, conn, pd, req, func(evt rpc.StreamEvent) {
			runtime.EventsEmit(a.ctx, "stream:event", evt)
		})
		if err != nil {
			logger.Default.Errorf("stream %s error: %v", req.MethodPath, err)
			runtime.EventsEmit(a.ctx, "stream:event", rpc.StreamEvent{
				Type:  "error",
				Error: err.Error(),
			})
		} else {
			logger.Default.Infof("stream %s done", req.MethodPath)
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

func interpolateRequest(req rpc.InvokeRequest, defaultMeta []rpc.MetadataEntry, env *storage.Environment, allowShell bool, inheritEnv bool) rpc.InvokeRequest {
	// Resolve dynamic syntax in per-request metadata values.
	for i, m := range req.Metadata {
		if resolved := resolveHeaderValue(m.Value, allowShell, inheritEnv); resolved != m.Value {
			req.Metadata[i].Value = resolved
		}
	}

	if len(defaultMeta) == 0 && (env == nil || len(env.Headers) == 0) {
		return req
	}

	// Build key sets for higher-priority layers (env + per-request override default;
	// per-request overrides env). Precedence: default → env → per-request.
	requestKeys := make(map[string]bool, len(req.Metadata))
	for _, entry := range req.Metadata {
		key := strings.TrimSpace(entry.Key)
		if key == "" {
			continue
		}
		requestKeys[strings.ToLower(key)] = true
	}

	// Environment metadata (overridden by per-request).
	envMeta := make([]rpc.MetadataEntry, 0)
	envKeys := make(map[string]bool)
	if env != nil {
		for _, h := range env.Headers {
			key := strings.TrimSpace(h.Key)
			if key == "" {
				continue
			}
			lower := strings.ToLower(key)
			if requestKeys[lower] || envKeys[lower] {
				continue
			}
			envKeys[lower] = true
			envMeta = append(envMeta, rpc.MetadataEntry{Key: key, Value: resolveHeaderValue(h.Value, allowShell, inheritEnv)})
		}
	}

	// Default metadata (lowest priority — skipped if key appears in env or request).
	defaultOut := make([]rpc.MetadataEntry, 0, len(defaultMeta))
	for _, m := range defaultMeta {
		key := strings.TrimSpace(m.Key)
		if key == "" {
			continue
		}
		lower := strings.ToLower(key)
		if requestKeys[lower] || envKeys[lower] {
			continue
		}
		defaultOut = append(defaultOut, rpc.MetadataEntry{Key: key, Value: resolveHeaderValue(m.Value, allowShell, inheritEnv)})
	}

	req.Metadata = append(defaultOut, append(envMeta, req.Metadata...)...)
	return req
}
