package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"time"
)

var (
	// ${VAR_NAME} — OS environment variable substitution.
	reEnvVar = regexp.MustCompile(`\$\{([^}]+)\}`)
	// $(command) — shell command substitution.
	reShellCmd = regexp.MustCompile(`\$\(([^)]+)\)`)
)

// resolveHeaderValue resolves dynamic syntax in a header value string:
//
//   - ${VAR_NAME}  → os.Getenv("VAR_NAME"); empty string if unset
//   - $(command)   → stdout of the command run via sh/cmd; trimmed (when enabled)
//
// Resolution failures are logged and replaced with an empty string so the
// request still proceeds. Values without either syntax are returned unchanged.
func resolveHeaderValue(val string, allowShell bool) string {
	hasEnvVar := strings.Contains(val, "${")
	hasShellCmd := strings.Contains(val, "$(")
	if !hasEnvVar && !hasShellCmd {
		return val
	}

	if allowShell && hasShellCmd {
		// Resolve $(command) first. Note: env-var substitution below will run on the full
		// result, so any ${VAR} in command output will be evaluated in the second pass.
		val = reShellCmd.ReplaceAllStringFunc(val, func(match string) string {
			cmd := reShellCmd.FindStringSubmatch(match)[1]
			out, err := runShellCommand(cmd)
			if err != nil {
				fmt.Printf("warning: header command %q failed: %v\n", cmd, err)
				return ""
			}
			return out
		})
	}

	// Resolve ${VAR_NAME}.
	if hasEnvVar {
		val = reEnvVar.ReplaceAllStringFunc(val, func(match string) string {
			name := reEnvVar.FindStringSubmatch(match)[1]
			return os.Getenv(strings.TrimSpace(name))
		})
	}

	return val
}

// runShellCommand executes cmd via the platform shell and returns trimmed stdout.
// A 5-second context deadline prevents hangs.
func runShellCommand(cmd string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var c *exec.Cmd
	if runtime.GOOS == "windows" {
		c = exec.CommandContext(ctx, "cmd", "/c", cmd)
	} else {
		c = exec.CommandContext(ctx, "sh", "-c", cmd)
	}

	var stdout, stderr bytes.Buffer
	c.Stdout = &stdout
	c.Stderr = &stderr

	if err := c.Run(); err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}
