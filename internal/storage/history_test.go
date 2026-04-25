package storage

import (
	"fmt"
	"os"
	"sync"
	"testing"
)

func TestHistoryAddReturnsReadErrors(t *testing.T) {
	store := &HistoryStore{dir: t.TempDir()}
	method := "svc.v1.Service/Call"
	if err := os.MkdirAll(store.filePath(method), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	err := store.Add(HistoryEntry{ID: "1", MethodPath: method, RequestJSON: `{}`})
	if err == nil {
		t.Fatal("expected read error")
	}
}

func TestHistoryAddConcurrent(t *testing.T) {
	store := &HistoryStore{dir: t.TempDir()}
	method := "svc.v1.Service/Call"

	const total = 100
	var wg sync.WaitGroup
	errCh := make(chan error, total)
	for i := 0; i < total; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := store.Add(HistoryEntry{
				ID:          fmt.Sprintf("%d", i),
				MethodPath:  method,
				RequestJSON: `{}`,
			})
			errCh <- err
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			t.Fatalf("add failed: %v", err)
		}
	}

	entries, err := store.GetHistory(method)
	if err != nil {
		t.Fatalf("get history: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("expected history entries")
	}
	if len(entries) > maxHistoryPerMethod {
		t.Fatalf("expected max %d entries, got %d", maxHistoryPerMethod, len(entries))
	}
}
