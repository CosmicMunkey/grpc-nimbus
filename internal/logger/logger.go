package logger

import (
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

type Level int

const (
	LevelInfo Level = iota
	LevelWarn
	LevelError
)

func (l Level) String() string {
	switch l {
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "INFO"
	}
}

type Entry struct {
	Level     Level  `json:"level"`
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

type Logger struct {
	mu      sync.RWMutex
	ring    []Entry
	cap     int
	head    int
	count   int
	OnEntry func(Entry)
	Writer  io.Writer
}

func New(capacity int) *Logger {
	if capacity <= 0 {
		capacity = 1000
	}
	return &Logger{
		ring:   make([]Entry, capacity),
		cap:    capacity,
		Writer: os.Stderr,
	}
}

func (l *Logger) log(level Level, msg string) {
	entry := Entry{
		Level:     level,
		Timestamp: time.Now().Format(time.RFC3339Nano),
		Message:   msg,
	}

	l.mu.Lock()
	l.ring[l.head] = entry
	l.head = (l.head + 1) % l.cap
	if l.count < l.cap {
		l.count++
	}
	cb := l.OnEntry
	w := l.Writer
	l.mu.Unlock()

	if cb != nil {
		cb(entry)
	}
	if w != nil {
		fmt.Fprintf(w, "[%s] [%s] %s\n", entry.Timestamp, level, msg)
	}
}

func (l *Logger) Info(msg string)  { l.log(LevelInfo, msg) }
func (l *Logger) Warn(msg string)  { l.log(LevelWarn, msg) }
func (l *Logger) Error(msg string) { l.log(LevelError, msg) }

func (l *Logger) Infof(format string, args ...any)  { l.log(LevelInfo, fmt.Sprintf(format, args...)) }
func (l *Logger) Warnf(format string, args ...any)  { l.log(LevelWarn, fmt.Sprintf(format, args...)) }
func (l *Logger) Errorf(format string, args ...any) { l.log(LevelError, fmt.Sprintf(format, args...)) }

func (l *Logger) GetLogs(severity string) []Entry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	if l.count == 0 {
		return nil
	}

	level := parseSeverity(severity)

	start := 0
	if l.count >= l.cap {
		start = l.head
	}

	var result []Entry
	for i := 0; i < l.count; i++ {
		idx := (start + i) % l.cap
		entry := l.ring[idx]
		if level < 0 || entry.Level == level {
			result = append(result, entry)
		}
	}

	return result
}

func (l *Logger) Clear() {
	l.mu.Lock()
	l.head = 0
	l.count = 0
	for i := range l.ring {
		l.ring[i] = Entry{}
	}
	l.mu.Unlock()
}

// parseSeverity converts a severity string to a Level value.
// Returns -1 for "all" or empty string (meaning no filtering).
func parseSeverity(s string) Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "info":
		return LevelInfo
	case "warn", "warning":
		return LevelWarn
	case "error":
		return LevelError
	default:
		return -1
	}
}

var Default = New(1000)
