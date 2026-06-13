package backend

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
	// ${VAR} always expands from os.Getenv regardless of inheritEnv.
	t.Setenv("NIMBUS_TEST_TOKEN", "secret123")
	for _, inherit := range []bool{true, false} {
		if got := resolveHeaderValue("Bearer ${NIMBUS_TEST_TOKEN}", false, inherit); got != "Bearer secret123" {
			t.Errorf("inheritEnv=%v: got %q, want %q", inherit, got, "Bearer secret123")
		}
	}
}

func TestResolveHeaderValue_EnvVar_Unset(t *testing.T) {
	os.Unsetenv("NIMBUS_UNSET_VAR")
	for _, inherit := range []bool{true, false} {
		if got := resolveHeaderValue("${NIMBUS_UNSET_VAR}", false, inherit); got != "" {
			t.Errorf("inheritEnv=%v: expected empty string for unset var, got %q", inherit, got)
		}
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
	// ${VAR} always expands from os.Getenv regardless of inheritEnv.
	t.Setenv("NIMBUS_SUFFIX", "world")
	for _, inherit := range []bool{true, false} {
		if got := resolveHeaderValue("hello-${NIMBUS_SUFFIX}", false, inherit); got != "hello-world" {
			t.Errorf("inheritEnv=%v: got %q, want %q", inherit, got, "hello-world")
		}
	}
}

func TestResolveHeaderValue_ShellDisabled(t *testing.T) {
	// Shell disabled: $(…) literal is preserved, ${VAR} always expands.
	t.Setenv("NIMBUS_SUFFIX", "world")
	for _, inherit := range []bool{true, false} {
		if got := resolveHeaderValue("token=$(echo nope)-${NIMBUS_SUFFIX}", false, inherit); got != "token=$(echo nope)-world" {
			t.Errorf("inheritEnv=%v: got %q, want %q", inherit, got, "token=$(echo nope)-world")
		}
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
	// ${VAR} always expands. When inheritEnv=true the value comes from the
	// login-shell env (computeLoginShellEnv); in tests that environment
	// includes whatever the test process has, so the result should match
	// os.Getenv for any var set via t.Setenv.
	t.Setenv("TEST_VAR", "test_value")
	for _, inherit := range []bool{true, false} {
		if got := resolveHeaderValue("value=${TEST_VAR}", false, inherit); got != "value=test_value" {
			t.Errorf("inheritEnv=%v: got %q, want %q", inherit, got, "value=test_value")
		}
	}
}

func TestResolveHeaderValue_PATH_Consistency(t *testing.T) {
	// With inheritEnv=false ${PATH} returns the startup process PATH.
	// With inheritEnv=true it returns the login-shell PATH, which should be
	// at least as long (login shell can only add entries, not remove them).
	if runtime.GOOS == "windows" {
		t.Skip("login shell probe is not implemented for windows")
	}
	pathFalse := resolveHeaderValue("${PATH}", false, false)
	pathTrue := resolveHeaderValue("${PATH}", false, true)
	if pathFalse == "" {
		t.Error("${PATH} with inheritEnv=false returned empty string")
	}
	if pathTrue == "" {
		t.Error("${PATH} with inheritEnv=true returned empty string")
	}
	// The two values can be the same (e.g. in dev/terminal mode) or different
	// (in production Finder mode). Both must be non-empty valid PATH strings.
	t.Logf("inheritEnv=false PATH: %s", pathFalse)
	t.Logf("inheritEnv=true  PATH: %s", pathTrue)
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
