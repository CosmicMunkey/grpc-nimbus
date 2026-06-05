package protoresolver

import (
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/util"
)

// ImportFromErrorLine parses the protoreflect/protoparse error to extract the file and the import reference.
func ImportFromErrorLine(err error, protoFiles []string) (string, string, bool) {
	msg := err.Error()
	before, _, ok := strings.Cut(msg, ": open ")
	if !ok {
		return "", "", false
	}
	prefix := before
	parts := strings.Split(prefix, ":")
	if len(parts) < 3 {
		return "", "", false
	}
	lineNo, convErr := strconv.Atoi(parts[len(parts)-2])
	if convErr != nil {
		return "", "", false
	}
	sourceToken := strings.TrimSpace(parts[len(parts)-3])
	var sourcePath string
	for _, file := range protoFiles {
		if filepath.Base(file) == sourceToken || strings.HasSuffix(file, sourceToken) {
			sourcePath = file
			break
		}
	}
	if sourcePath == "" {
		return "", "", false
	}
	data, readErr := os.ReadFile(sourcePath)
	if readErr != nil {
		return "", "", false
	}
	lines := strings.Split(string(data), "\n")
	if lineNo < 1 || lineNo > len(lines) {
		return "", "", false
	}
	line := strings.TrimSpace(lines[lineNo-1])
	const prefixImport = `import "`
	if !strings.HasPrefix(line, prefixImport) {
		return "", "", false
	}
	rest := strings.TrimPrefix(line, prefixImport)
	before, _, found := strings.Cut(rest, `"`)
	if !found {
		return "", "", false
	}
	return sourcePath, before, true
}

// SearchImportRootInDir searches for a matching import root within a single directory.
// Returns the best match (shortest path to root) or empty string if none found.
func SearchImportRootInDir(searchDir, suffix string, known map[string]bool) string {
	best := ""
	_ = filepath.Walk(searchDir, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil || info == nil || info.IsDir() {
			return nil
		}
		cleanPath := filepath.Clean(path)
		if !strings.HasSuffix(cleanPath, suffix) {
			return nil
		}
		root := filepath.Clean(strings.TrimSuffix(cleanPath, suffix))
		root = strings.TrimSuffix(root, string(filepath.Separator))
		if root == "" || known[root] {
			return nil
		}
		if best == "" || len(root) < len(best) {
			best = root
		}
		return nil
	})
	return best
}

// MatchingImportRoot searches for a matching import root. It first searches in the
// primary searchRoot, then optionally in vendorRoot if provided. Uses "prefer-closest"
// strategy: returns the match with the shortest path to root.
func MatchingImportRoot(searchRoot, importRef string, known map[string]bool) (string, bool) {
	suffix := filepath.Clean(filepath.FromSlash(importRef))
	best := SearchImportRootInDir(searchRoot, suffix, known)

	// If no match in primary root, the function returns empty and we're done.
	// If we found a match, we'll compare with vendor matches below.
	if best != "" {
		return best, true
	}
	return "", false
}

// MatchingImportRootWithVendor searches for a matching import root in both the
// primary searchRoot and an optional vendorRoot. When vendorRoot is provided and
// contains a match it is always preferred over any match found inside searchRoot,
// because the vendor tree is the canonical location for explicitly vendored imports.
func MatchingImportRootWithVendor(searchRoot, vendorRoot, importRef string, known map[string]bool) (string, bool) {
	suffix := filepath.Clean(filepath.FromSlash(importRef))

	if vendorRoot != "" {
		if vendorMatch := SearchImportRootInDir(vendorRoot, suffix, known); vendorMatch != "" {
			return vendorMatch, true
		}
	}

	if best := SearchImportRootInDir(searchRoot, suffix, known); best != "" {
		return best, true
	}
	return "", false
}

// DiscoverImportPaths finds import paths within a vendor directory.
func DiscoverImportPaths(protoFiles, importPaths []string) []string {
	searchRoot := util.CommonDir(protoFiles)
	if searchRoot == "" {
		return nil
	}
	known := map[string]bool{}
	for _, path := range importPaths {
		known[path] = true
	}

	// Prefer searchRoot/vendor (closest to the loaded files) over parentDir/vendor.
	vendorRoot := ""
	if info, err := os.Stat(filepath.Join(searchRoot, "vendor")); err == nil && info.IsDir() {
		vendorRoot = filepath.Join(searchRoot, "vendor")
	} else if parentDir := filepath.Dir(searchRoot); parentDir != searchRoot {
		if info, err := os.Stat(filepath.Join(parentDir, "vendor")); err == nil && info.IsDir() {
			vendorRoot = filepath.Join(parentDir, "vendor")
		}
	}

	var discovered []string
	for _, file := range protoFiles {
		for _, importRef := range util.ImportRefs(file) {
			root, ok := MatchingImportRootWithVendor(searchRoot, vendorRoot, importRef, known)
			if ok {
				known[root] = true
				discovered = append(discovered, root)
			}
		}
	}
	return util.DedupeStrings(discovered)
}

// InferImportPath attempts to deduce import root path from failure messages.
func InferImportPath(err error, protoFiles, importPaths []string) (string, bool) {
	_, importRef, ok := ImportFromErrorLine(err, protoFiles)
	if !ok {
		return "", false
	}
	suffix := filepath.Clean(filepath.FromSlash(importRef))
	searchRoot := util.CommonDir(protoFiles)
	if searchRoot == "" {
		return "", false
	}
	known := map[string]bool{}
	for _, path := range importPaths {
		known[path] = true
	}

	best, ok := MatchingImportRoot(searchRoot, suffix, known)
	if !ok {
		return "", false
	}
	return best, true
}

// FindGoModuleRoot walks up from startDir looking for a go.mod file.
// Returns (modulePath, moduleRoot) where modulePath is the module directive
// value and moduleRoot is the directory containing go.mod. Both are empty if
// no go.mod is found within a reasonable depth.
func FindGoModuleRoot(startDir string) (string, string) {
	dir := startDir
	for range 15 {
		goMod := filepath.Join(dir, "go.mod")
		if data, err := os.ReadFile(goMod); err == nil {
			for _, line := range strings.SplitN(string(data), "\n", 20) {
				line = strings.TrimSpace(line)
				if after, ok := strings.CutPrefix(line, "module "); ok {
					mod := strings.TrimSpace(after)
					// Strip any trailing inline // comment (e.g. "module foo/bar // comment").
					if idx := strings.Index(mod, "//"); idx >= 0 {
						mod = strings.TrimSpace(mod[:idx])
					}
					if mod != "" {
						return mod, dir
					}
				}
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", ""
}

// MakeVirtualRoot creates a temp directory containing a symlink
// <tmp>/<modulePathOnDisk> → actualRoot. Returns (tmpDir, ok).
// The caller must remove tmpDir when done.
func MakeVirtualRoot(modulePathOnDisk, actualRoot string) (string, bool) {
	// Reject absolute paths and traversal sequences so the symlink cannot
	// escape the temp directory and affect paths outside the cleanup scope.
	clean := filepath.Clean(modulePathOnDisk)
	if filepath.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", false
	}
	tmp, err := os.MkdirTemp("", "grpc-nimbus-virtual-*")
	if err != nil {
		return "", false
	}
	linkPath := filepath.Join(tmp, clean)
	// Belt-and-suspenders: confirm linkPath is actually inside tmp.
	if !strings.HasPrefix(linkPath, tmp+string(filepath.Separator)) {
		os.RemoveAll(tmp)
		return "", false
	}
	linkParent := filepath.Dir(linkPath)
	if linkParent != tmp {
		if err := os.MkdirAll(linkParent, 0755); err != nil {
			os.RemoveAll(tmp)
			return "", false
		}
	}
	if err := os.Symlink(actualRoot, linkPath); err != nil {
		// os.Symlink for directories can fail on Windows without Developer Mode.
		// Fall back to a recursive directory copy so proto loading still works.
		if copyErr := CopyDirTree(actualRoot, linkPath); copyErr != nil {
			os.RemoveAll(tmp)
			return "", false
		}
	}
	return tmp, true
}

// CopyDirTree recursively copies the directory tree at src into dst.
// Used as a fallback when os.Symlink is unavailable (e.g. Windows without
// Developer Mode enabled).
func CopyDirTree(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		dstFile, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode())
		if err != nil {
			return err
		}
		defer dstFile.Close()

		if _, err := io.Copy(dstFile, srcFile); err != nil {
			return err
		}
		return nil
	})
}

// InferVirtualImportRootFromGoMod attempts to resolve a module-path-prefixed
// import by locating a go.mod in parent directories of sourceDir.
func InferVirtualImportRootFromGoMod(importRef, sourceDir string) (string, bool) {
	modulePath, moduleRoot := FindGoModuleRoot(sourceDir)
	if modulePath == "" || moduleRoot == "" {
		return "", false
	}
	importRefSlash := filepath.ToSlash(importRef)
	if !strings.HasPrefix(importRefSlash, modulePath+"/") {
		return "", false
	}
	inModulePath := strings.TrimPrefix(importRefSlash, modulePath+"/")
	actualFile := filepath.Join(moduleRoot, filepath.FromSlash(inModulePath))
	if _, err := os.Stat(actualFile); err != nil {
		return "", false
	}
	return MakeVirtualRoot(filepath.FromSlash(modulePath), moduleRoot)
}

// InferVirtualImportRootByHeuristic falls back to a suffix-stripping search
// when no go.mod is found.
func InferVirtualImportRootByHeuristic(importRef, searchRoot string) (string, bool) {
	if searchRoot == "" {
		return "", false
	}
	components := strings.Split(filepath.ToSlash(importRef), "/")
	if len(components) < 2 {
		return "", false
	}
	for i := 1; i < len(components)-1; i++ {
		suffix := filepath.Join(components[i:]...)
		var matches []string
		_ = filepath.Walk(searchRoot, func(path string, info os.FileInfo, walkErr error) error {
			if walkErr != nil || info == nil || info.IsDir() {
				return nil
			}
			cleanPath := filepath.Clean(path)
			if strings.HasSuffix(cleanPath, string(os.PathSeparator)+suffix) {
				matches = append(matches, cleanPath)
			}
			return nil
		})
		if len(matches) != 1 {
			continue // ambiguous or not found
		}
		actualRoot := strings.TrimSuffix(matches[0], string(os.PathSeparator)+suffix)
		if actualRoot == "" {
			continue
		}
		prefix := filepath.FromSlash(strings.Join(components[:i], "/"))
		return MakeVirtualRoot(prefix, actualRoot)
	}
	return "", false
}

// InferVirtualImportRoot creates a virtual import root to resolve module-path imports.
func InferVirtualImportRoot(importRef, sourcePath string) (string, bool) {
	sourceDir := filepath.Dir(sourcePath)

	// Primary: find go.mod and use the declared module path for exact mapping.
	if tmpDir, ok := InferVirtualImportRootFromGoMod(importRef, sourceDir); ok {
		return tmpDir, true
	}

	// Fallback: suffix-stripping heuristic for repos without go.mod.
	if tmpDir, ok := InferVirtualImportRootByHeuristic(importRef, sourceDir); ok {
		return tmpDir, true
	}

	return "", false
}

// ResolveProtoFiles loads proto files with the same import-path inference and
// virtual-root logic used by App.LoadProtoFiles, but operates on just the
// rpc.LoadProtoFiles layer (no protosets, no reflection).
//
// Ownership of virtualDirs on return:
//   - On success: the returned virtualDirs slice is handed to the caller, who
//     must call os.RemoveAll on each entry when the descriptor is no longer needed.
//   - On failure: this function cleans up any virtualDirs it created before
//     returning (nil, importPaths, nil, err).
func ResolveProtoFiles(importPaths, protoFiles []string) (*rpc.ProtosetDescriptor, []string, []string, error) {
	allImportPaths := append([]string(nil), importPaths...)
	var virtualDirs []string
	var (
		pd  *rpc.ProtosetDescriptor
		err error
	)
	for range 8 {
		effectivePaths := append(allImportPaths, virtualDirs...)
		pd, err = rpc.LoadProtoFiles(effectivePaths, protoFiles)
		if err == nil {
			// Success: return virtualDirs to caller; they are responsible for cleanup.
			return pd, allImportPaths, virtualDirs, nil
		}
		inferred, ok := InferImportPath(err, protoFiles, effectivePaths)
		if ok {
			allImportPaths = util.DedupeStrings(append(allImportPaths, inferred))
			continue
		}
		sourcePath, importRef, errOk := ImportFromErrorLine(err, protoFiles)
		if !errOk {
			break
		}
		virtDir, virtOk := InferVirtualImportRoot(importRef, sourcePath)
		if !virtOk {
			break
		}
		virtualDirs = append(virtualDirs, virtDir)
	}
	// Failure: clean up any virtual dirs we created.
	for _, d := range virtualDirs {
		os.RemoveAll(d)
	}
	return nil, importPaths, nil, err
}
