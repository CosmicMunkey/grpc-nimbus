package main

import (
	"os"
	"runtime"
	"testing"
)

func TestResolveHeaderValue_Plain(t *testing.T) {
	val := "Bearer eyJhbGci"
	if got := resolveHeaderValue(val, false); got != val {
		t.Errorf("plain value mutated: got %q", got)
	}
}

func TestResolveHeaderValue_EnvVar(t *testing.T) {
	t.Setenv("NIMBUS_TEST_TOKEN", "secret123")
	got := resolveHeaderValue("Bearer ${NIMBUS_TEST_TOKEN}", false)
	want := "Bearer secret123"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestResolveHeaderValue_EnvVar_Unset(t *testing.T) {
	os.Unsetenv("NIMBUS_UNSET_VAR")
	got := resolveHeaderValue("${NIMBUS_UNSET_VAR}", false)
	if got != "" {
		t.Errorf("expected empty string for unset var, got %q", got)
	}
}

func TestResolveHeaderValue_ShellCmd(t *testing.T) {
	got := resolveHeaderValue("$(echo hello)", true)
	if got != "hello" {
		t.Errorf("got %q, want %q", got, "hello")
	}
}

func TestResolveHeaderValue_ShellCmd_Trimmed(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("printf shell syntax is not portable to cmd.exe")
	}
	got := resolveHeaderValue("$(printf '  trimmed  ')", true)
	if got != "trimmed" {
		t.Errorf("got %q, want %q", got, "trimmed")
	}
}

func TestResolveHeaderValue_ShellCmd_Error(t *testing.T) {
	// A failing command should return empty string, not panic.
	got := resolveHeaderValue("$(exit 1)", true)
	if got != "" {
		t.Errorf("expected empty string on error, got %q", got)
	}
}

func TestResolveHeaderValue_Combined(t *testing.T) {
	t.Setenv("NIMBUS_SUFFIX", "world")
	got := resolveHeaderValue("hello-${NIMBUS_SUFFIX}", false)
	if got != "hello-world" {
		t.Errorf("got %q, want %q", got, "hello-world")
	}
}

func TestResolveHeaderValue_ShellDisabled(t *testing.T) {
	t.Setenv("NIMBUS_SUFFIX", "world")
	got := resolveHeaderValue("token=$(echo nope)-${NIMBUS_SUFFIX}", false)
	if got != "token=$(echo nope)-world" {
		t.Errorf("got %q, want %q", got, "token=$(echo nope)-world")
	}
}
