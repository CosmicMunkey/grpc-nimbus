package main

import (
	"os"
	"runtime"
	"testing"
)

func TestResolveHeaderValue_Plain(t *testing.T) {
	val := "Bearer eyJhbGci"
	if got := resolveHeaderValue(val, false, false); got != val {
		t.Errorf("plain value mutated: got %q", got)
	}
}

func TestResolveHeaderValue_EnvVar(t *testing.T) {
	t.Setenv("NIMBUS_TEST_TOKEN", "secret123")
	got := resolveHeaderValue("Bearer ${NIMBUS_TEST_TOKEN}", false, false)
	want := "Bearer secret123"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestResolveHeaderValue_EnvVar_Unset(t *testing.T) {
	os.Unsetenv("NIMBUS_UNSET_VAR")
	got := resolveHeaderValue("${NIMBUS_UNSET_VAR}", false, false)
	if got != "" {
		t.Errorf("expected empty string for unset var, got %q", got)
	}
}

func TestResolveHeaderValue_ShellCmd(t *testing.T) {
	got := resolveHeaderValue("$(echo hello)", true, false)
	if got != "hello" {
		t.Errorf("got %q, want %q", got, "hello")
	}
}

func TestResolveHeaderValue_ShellCmd_Trimmed(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("printf shell syntax is not portable to cmd.exe")
	}
	got := resolveHeaderValue("$(printf '  trimmed  ')", true, false)
	if got != "trimmed" {
		t.Errorf("got %q, want %q", got, "trimmed")
	}
}

func TestResolveHeaderValue_ShellCmd_Error(t *testing.T) {
	// A failing command should return empty string, not panic.
	got := resolveHeaderValue("$(exit 1)", true, false)
	if got != "" {
		t.Errorf("expected empty string on error, got %q", got)
	}
}

func TestResolveHeaderValue_Combined(t *testing.T) {
	t.Setenv("NIMBUS_SUFFIX", "world")
	got := resolveHeaderValue("hello-${NIMBUS_SUFFIX}", false, false)
	if got != "hello-world" {
		t.Errorf("got %q, want %q", got, "hello-world")
	}
}

func TestResolveHeaderValue_ShellDisabled(t *testing.T) {
	t.Setenv("NIMBUS_SUFFIX", "world")
	got := resolveHeaderValue("token=$(echo nope)-${NIMBUS_SUFFIX}", false, false)
	if got != "token=$(echo nope)-world" {
		t.Errorf("got %q, want %q", got, "token=$(echo nope)-world")
	}
}

// ── InheritShellEnv tests ──────────────────────────────────────────────────────

func TestResolveHeaderValue_InheritEnv_ShellCommand(t *testing.T) {
	// When inheritEnv is true and shell is allowed, the command should execute
	// with access to the parent environment.
	t.Setenv("TEST_INHERIT_VAR", "inherited_value")
	// Use a shell command that reads an environment variable
	got := resolveHeaderValue("$(echo ${TEST_INHERIT_VAR})", true, true)
	if got != "inherited_value" {
		t.Errorf("got %q, want %q", got, "inherited_value")
	}
}

func TestResolveHeaderValue_NoInheritEnv_ShellCommand(t *testing.T) {
	// When inheritEnv is false, shell commands won't have access to
	// parent environment variables (they'll see app process env instead).
	// This test just verifies the flag doesn't break shell execution.
	got := resolveHeaderValue("$(echo hello)", true, false)
	if got != "hello" {
		t.Errorf("got %q, want %q", got, "hello")
	}
}

func TestResolveHeaderValue_InheritEnv_EnvVar(t *testing.T) {
	// ${VAR} syntax should work regardless of inheritEnv flag
	// because it uses os.Getenv which always reads from the process environment
	t.Setenv("TEST_VAR", "test_value")
	got := resolveHeaderValue("value=${TEST_VAR}", false, true)
	if got != "value=test_value" {
		t.Errorf("got %q, want %q", got, "value=test_value")
	}
}

func TestResolveHeaderValue_InheritEnv_Combined(t *testing.T) {
	// Test that both $(command) with inheritEnv and ${VAR} work together
	t.Setenv("TEST_PREFIX", "prefix")
	// This command should see TEST_PREFIX in its environment when inheritEnv is true
	got := resolveHeaderValue("${TEST_PREFIX}-$(echo suffix)", true, true)
	want := "prefix-suffix"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}
