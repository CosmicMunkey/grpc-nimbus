package util

import (
	"os"
	"path/filepath"
	"strings"
)

// DedupeStrings returns a new slice with empty strings removed and duplicates eliminated,
// preserving the original order of first occurrences.
func DedupeStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, v := range values {
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

// CommonDir returns the longest common parent directory of all given paths.
// Returns empty string if paths is empty.
func CommonDir(paths []string) string {
	if len(paths) == 0 {
		return ""
	}
	common := filepath.Dir(paths[0])
	for _, p := range paths[1:] {
		dir := filepath.Dir(p)
		for dir != common && !strings.HasPrefix(dir, common+string(filepath.Separator)) {
			parent := filepath.Dir(common)
			if parent == common {
				return common
			}
			common = parent
		}
	}
	return common
}

// ImportRefs parses a .proto file and returns the list of import paths it references.
// Returns nil if the file cannot be read.
func ImportRefs(path string) []string {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	lines := strings.Split(string(data), "\n")
	var refs []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		const prefix = `import "`
		if !strings.HasPrefix(line, prefix) {
			continue
		}
		rest := strings.TrimPrefix(line, prefix)
		before, _, ok := strings.Cut(rest, `"`)
		if !ok {
			continue
		}
		refs = append(refs, before)
	}
	return refs
}
