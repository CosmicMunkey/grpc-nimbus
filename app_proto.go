package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
	"github.com/CosmicMunkey/grpc-nimbus/internal/util"
)

// LoadedState bundles the currently loaded descriptor info for frontend restoration.
type LoadedState struct {
	Services            []rpc.ServiceInfo `json:"services"`
	LoadedPaths         []string          `json:"loadedPaths"`
	LoadedProtosets     []string          `json:"loadedProtosets"`
	LoadedProtoFiles    []string          `json:"loadedProtoFiles"`
	LoadMode            string            `json:"loadMode"`         // "protoset", "proto", "reflection", "mixed", or ""
	ProtoImportPaths    []string          `json:"protoImportPaths"` // effective import paths for loaded .proto files
	LastTarget          string            `json:"lastTarget"`       // last-used connection target
	LastTLS             string            `json:"lastTLS"`
	ActiveEnvironmentID string            `json:"activeEnvironmentId"` // active environment ID (empty = none)
}

func importFromErrorLine(err error, protoFiles []string) (string, string, bool) {
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

// searchImportRootInDir searches for a matching import root within a single directory.
// Returns the best match (shortest path to root) or empty string if none found.
func searchImportRootInDir(searchDir, suffix string, known map[string]bool) string {
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

// matchingImportRoot searches for a matching import root. It first searches in the
// primary searchRoot, then optionally in vendorRoot if provided. Uses "prefer-closest"
// strategy: returns the match with the shortest path to root.
func matchingImportRoot(searchRoot, importRef string, known map[string]bool) (string, bool) {
	suffix := filepath.Clean(filepath.FromSlash(importRef))
	best := searchImportRootInDir(searchRoot, suffix, known)

	// If no match in primary root, the function returns empty and we're done.
	// If we found a match, we'll compare with vendor matches below.
	if best != "" {
		return best, true
	}
	return "", false
}

// matchingImportRootWithVendor searches for a matching import root in both the
// primary searchRoot and an optional vendorRoot. When vendorRoot is provided and
// contains a match it is always preferred over any match found inside searchRoot,
// because the vendor tree is the canonical location for explicitly vendored imports.
func matchingImportRootWithVendor(searchRoot, vendorRoot, importRef string, known map[string]bool) (string, bool) {
	suffix := filepath.Clean(filepath.FromSlash(importRef))

	if vendorRoot != "" {
		if vendorMatch := searchImportRootInDir(vendorRoot, suffix, known); vendorMatch != "" {
			return vendorMatch, true
		}
	}

	if best := searchImportRootInDir(searchRoot, suffix, known); best != "" {
		return best, true
	}
	return "", false
}

func discoverImportPaths(protoFiles, importPaths []string) []string {
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
			root, ok := matchingImportRootWithVendor(searchRoot, vendorRoot, importRef, known)
			if ok {
				known[root] = true
				discovered = append(discovered, root)
			}
		}
	}
	return util.DedupeStrings(discovered)
}

func inferImportPath(err error, protoFiles, importPaths []string) (string, bool) {
	_, importRef, ok := importFromErrorLine(err, protoFiles)
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

	best, ok := matchingImportRoot(searchRoot, suffix, known)
	if !ok {
		return "", false
	}
	return best, true
}

// findGoModuleRoot walks up from startDir looking for a go.mod file.
// Returns (modulePath, moduleRoot) where modulePath is the module directive
// value and moduleRoot is the directory containing go.mod. Both are empty if
// no go.mod is found within a reasonable depth.
func findGoModuleRoot(startDir string) (string, string) {
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

// makeVirtualRoot creates a temp directory containing a symlink
// <tmp>/<modulePathOnDisk> → actualRoot. Returns (tmpDir, ok).
// The caller must remove tmpDir when done.
func makeVirtualRoot(modulePathOnDisk, actualRoot string) (string, bool) {
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
		if copyErr := copyDirTree(actualRoot, linkPath); copyErr != nil {
			os.RemoveAll(tmp)
			return "", false
		}
	}
	return tmp, true
}

// copyDirTree recursively copies the directory tree at src into dst.
// Used as a fallback when os.Symlink is unavailable (e.g. Windows without
// Developer Mode enabled).
func copyDirTree(src, dst string) error {
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
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, info.Mode())
	})
}

// inferVirtualImportRootFromGoMod attempts to resolve a module-path-prefixed
// import by locating a go.mod in parent directories of sourceDir. When found,
// it verifies the import ref starts with the declared module path and the file
// exists under the module root, then creates a symlink virtual import root.
func inferVirtualImportRootFromGoMod(importRef, sourceDir string) (string, bool) {
	modulePath, moduleRoot := findGoModuleRoot(sourceDir)
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
	return makeVirtualRoot(filepath.FromSlash(modulePath), moduleRoot)
}

// inferVirtualImportRootByHeuristic falls back to a suffix-stripping search
// when no go.mod is found. It strips leading path components from importRef
// one at a time and looks for a file matching the remaining suffix within
// searchRoot. To avoid false positives, only a unique match is accepted.
func inferVirtualImportRootByHeuristic(importRef, searchRoot string) (string, bool) {
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
		return makeVirtualRoot(prefix, actualRoot)
	}
	return "", false
}

// inferVirtualImportRoot creates a virtual import root to resolve module-path
// imports (e.g., "example.com/org/module/service.proto" → on-disk file at
// "<module-root>/service.proto"). sourcePath is the .proto file whose import
// statement triggered the error; its directory anchors the go.mod search.
//
// Returns (tmpDir, ok). tmpDir must be removed by the caller when done.
func inferVirtualImportRoot(importRef, sourcePath string) (string, bool) {
	sourceDir := filepath.Dir(sourcePath)

	// Primary: find go.mod and use the declared module path for exact mapping.
	if tmpDir, ok := inferVirtualImportRootFromGoMod(importRef, sourceDir); ok {
		return tmpDir, true
	}

	// Fallback: suffix-stripping heuristic for repos without go.mod.
	if tmpDir, ok := inferVirtualImportRootByHeuristic(importRef, sourceDir); ok {
		return tmpDir, true
	}

	return "", false
}

// resolveProtoFiles loads proto files with the same import-path inference and
// virtual-root logic used by App.LoadProtoFiles, but operates on just the
// rpc.LoadProtoFiles layer (no protosets, no reflection). It is used by the
// startup path to restore proto files that need module-path import resolution.
//
// Returns (pd, realImportPaths, virtualDirs, err). virtualDirs are temp
// directories that must be cleaned up by the caller; realImportPaths are the
// inferred real import paths suitable for persisting to settings.
func resolveProtoFiles(importPaths, protoFiles []string) (*rpc.ProtosetDescriptor, []string, []string, error) {
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
			return pd, allImportPaths, virtualDirs, nil
		}
		inferred, ok := inferImportPath(err, protoFiles, effectivePaths)
		if ok {
			allImportPaths = util.DedupeStrings(append(allImportPaths, inferred))
			continue
		}
		sourcePath, importRef, errOk := importFromErrorLine(err, protoFiles)
		if !errOk {
			break
		}
		virtDir, virtOk := inferVirtualImportRoot(importRef, sourcePath)
		if !virtOk {
			break
		}
		virtualDirs = append(virtualDirs, virtDir)
	}
	for _, d := range virtualDirs {
		os.RemoveAll(d)
	}
	return nil, importPaths, nil, err
}

func (a *App) currentLoadModeLocked() string {
	count := 0
	if len(a.loadedProtosetPaths) > 0 {
		count++
	}
	if len(a.loadedProtoFiles) > 0 {
		count++
	}
	if a.loadReflection {
		count++
	}
	switch {
	case count == 0:
		return ""
	case count > 1:
		return "mixed"
	case a.loadReflection:
		return "reflection"
	case len(a.loadedProtoFiles) > 0:
		return "proto"
	default:
		return "protoset"
	}
}

func (a *App) combinedLoadedPathsLocked() []string {
	paths := append([]string(nil), a.loadedProtosetPaths...)
	paths = append(paths, a.loadedProtoFiles...)
	return util.DedupeStrings(paths)
}

func (a *App) rebuildDescriptor(ctx context.Context, protosets, importPaths, protoFiles []string, withReflection bool, connTarget *rpc.Connection) (*rpc.ProtosetDescriptor, error) {
	var parts []*rpc.ProtosetDescriptor
	if len(protosets) > 0 {
		pd, err := rpc.LoadProtosets(protosets)
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	if len(protoFiles) > 0 {
		pd, err := rpc.LoadProtoFiles(importPaths, protoFiles)
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	if withReflection {
		if connTarget == nil {
			return nil, fmt.Errorf("not connected — call Connect first")
		}
		pd, err := rpc.LoadViaReflection(ctx, connTarget.ClientConn())
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	return rpc.MergeDescriptors(parts...), nil
}

func (a *App) storeDescriptorState(pd *rpc.ProtosetDescriptor, protosets, importPaths, protoFiles []string, withReflection bool) {
	// Normalize all paths and ensure no path appears in both lists.
	// If a path is in protosets, it wins; remove it from protoFiles to prevent
	// double-tracking that would show the same file twice in the UI.
	cleanedProtosets := make([]string, 0, len(protosets))
	protosetSet := make(map[string]bool, len(protosets))
	for _, p := range protosets {
		cp := filepath.Clean(p)
		if cp != "" && cp != "." && !protosetSet[cp] {
			protosetSet[cp] = true
			cleanedProtosets = append(cleanedProtosets, cp)
		}
	}
	cleanedProtoFiles := make([]string, 0, len(protoFiles))
	seenFiles := make(map[string]bool, len(protoFiles))
	for _, p := range protoFiles {
		cp := filepath.Clean(p)
		if cp != "" && cp != "." && !protosetSet[cp] && !seenFiles[cp] {
			seenFiles[cp] = true
			cleanedProtoFiles = append(cleanedProtoFiles, cp)
		}
	}

	a.mu.Lock()
	old := a.protoset
	a.protoset = pd
	a.loadedProtosetPaths = cleanedProtosets
	a.loadedProtoFiles = cleanedProtoFiles
	a.loadImportPaths = append([]string(nil), importPaths...)
	a.loadReflection = withReflection
	a.mu.Unlock()

	// Close old descriptor after a delay so in-flight RPCs can finish.
	if old != nil {
		go func() {
			time.Sleep(5 * time.Second)
			old.Close()
		}()
	}
}

// LoadProtosets parses the given protoset file paths and returns the service tree.
func (a *App) LoadProtosets(paths []string) ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	currentProtosets := append([]string(nil), a.loadedProtosetPaths...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	virtualDirs := append([]string(nil), a.virtualImportDirs...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	logger.Default.Infof("loading protosets: %v", paths)
	allProtosets := util.DedupeStrings(append(currentProtosets, paths...))
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := a.rebuildDescriptor(a.ctx, allProtosets, effectivePaths, protoFiles, withReflection, conn)
	if err != nil {
		logger.Default.Errorf("loading protosets failed: %v", err)
		return nil, err
	}
	a.storeDescriptorState(pd, allProtosets, importPaths, protoFiles, withReflection)
	svcs := pd.Services()
	logger.Default.Infof("protosets loaded: %d service(s)", len(svcs))

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = allProtosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return svcs, nil
}

// LoadProtoFiles parses .proto source files with optional import paths.
// If importPaths is empty and the file paths are absolute, the parent directories
// of the proto files are used as import paths automatically.
func (a *App) LoadProtoFiles(importPaths, protoFiles []string) ([]rpc.ServiceInfo, error) {
	logger.Default.Infof("loading proto files: %v", protoFiles)
	seen := map[string]bool{}
	userPaths := make([]string, 0, len(importPaths))
	for _, dir := range importPaths {
		if dir != "" && !seen[dir] {
			seen[dir] = true
			userPaths = append(userPaths, dir)
		}
	}

	// Collect the proto parent directories separately so that vendor roots
	// discovered below can be placed ahead of them in the final import-path
	// list. protoparse resolves imports from the first matching import path,
	// so vendor roots must precede proto parent directories for vendored
	// imports to win over any local copy inside the proto source tree.
	var protoParentDirs []string
	for _, f := range protoFiles {
		if filepath.IsAbs(f) {
			dir := filepath.Dir(f)
			if !seen[dir] {
				seen[dir] = true
				protoParentDirs = append(protoParentDirs, dir)
			}
		}
	}

	// Discover vendor and other import roots. Discovery runs against the
	// user-provided paths only so that proto parent directories do not
	// shadow vendor roots in the known set.
	discovered := discoverImportPaths(protoFiles, userPaths)

	// Final order: user-provided → discovered (vendor-first) → proto parent dirs.
	importPaths = util.DedupeStrings(append(append(userPaths, discovered...), protoParentDirs...))
	a.mu.Lock()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	currentProtoFiles := append([]string(nil), a.loadedProtoFiles...)
	currentImportPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	allProtoFiles := util.DedupeStrings(append(currentProtoFiles, protoFiles...))
	allImportPaths := util.DedupeStrings(append(currentImportPaths, importPaths...))
	var virtualDirs []string
	var (
		pd  *rpc.ProtosetDescriptor
		err error
	)
	for range 8 {
		effectivePaths := append(allImportPaths, virtualDirs...)
		pd, err = a.rebuildDescriptor(a.ctx, protosets, effectivePaths, allProtoFiles, withReflection, conn)
		if err == nil {
			break
		}
		inferred, ok := inferImportPath(err, allProtoFiles, effectivePaths)
		if ok {
			allImportPaths = util.DedupeStrings(append(allImportPaths, inferred))
			continue
		}
		sourcePath, importRef, errOk := importFromErrorLine(err, allProtoFiles)
		if !errOk {
			break
		}
		virtDir, virtOk := inferVirtualImportRoot(importRef, sourcePath)
		if !virtOk {
			break
		}
		virtualDirs = append(virtualDirs, virtDir)
	}
	if err != nil {
		for _, d := range virtualDirs {
			os.RemoveAll(d)
		}
		logger.Default.Errorf("loading proto files failed: %v", err)
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, allImportPaths, allProtoFiles, withReflection)
	logger.Default.Infof("proto files loaded: %d service(s)", len(pd.Services()))

	// Track virtual dirs for cleanup; replace any from a previous load.
	a.mu.Lock()
	for _, d := range a.virtualImportDirs {
		os.RemoveAll(d)
	}
	a.virtualImportDirs = append([]string(nil), virtualDirs...)
	a.mu.Unlock()

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtoFilePaths = allProtoFiles
		s.ProtoImportPaths = allImportPaths
		s.ProtosetPaths = protosets
	})
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
// Note: reflection-loaded descriptors are NOT persisted since they require a
// live server connection which may not be available at next startup.
func (a *App) LoadViaReflection() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	conn := a.conn
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	virtualDirs := append([]string(nil), a.virtualImportDirs...)
	ctx, cancel := context.WithCancel(a.ctx)
	a.reflectionCancelSeq++
	cancelSeq := a.reflectionCancelSeq
	a.reflectionCancel = cancel
	a.mu.Unlock()

	defer func() {
		cancel()
		a.mu.Lock()
		if a.reflectionCancelSeq == cancelSeq {
			a.reflectionCancel = nil
		}
		a.mu.Unlock()
	}()

	if conn == nil {
		logger.Default.Errorf("load via reflection failed: not connected")
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	logger.Default.Infof("loading via reflection")
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := a.rebuildDescriptor(ctx, protosets, effectivePaths, protoFiles, true, conn)
	if err != nil {
		logger.Default.Errorf("reflection load failed: %v", err)
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, importPaths, protoFiles, true)
	logger.Default.Infof("reflection load complete: %d service(s)", len(pd.Services()))

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = protosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

// CancelReflection aborts the currently in-flight reflection load.
func (a *App) CancelReflection() {
	a.mu.Lock()
	cancel := a.reflectionCancel
	a.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// GetLoadedState returns the currently loaded descriptor state plus saved connection
// settings so the frontend can restore UI state on startup.
func (a *App) GetLoadedState() (*LoadedState, error) {
	a.mu.Lock()
	pd := a.protoset
	paths := a.combinedLoadedPathsLocked()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	mode := a.currentLoadModeLocked()
	importPaths := append([]string(nil), a.loadImportPaths...)
	a.mu.Unlock()

	state := &LoadedState{
		LoadMode:         mode,
		LoadedPaths:      paths,
		LoadedProtosets:  protosets,
		LoadedProtoFiles: protoFiles,
		ProtoImportPaths: importPaths,
	}

	if pd != nil {
		state.Services = pd.Services()
	}

	if a.settings != nil {
		if saved, err := a.settings.Load(); err == nil && saved != nil {
			state.LastTarget = saved.LastTarget
			state.LastTLS = saved.LastTLS
			state.ActiveEnvironmentID = saved.ActiveEnvironmentID
		}
	}
	return state, nil
}

// ClearLoadedProtos discards all loaded descriptors and removes saved paths,
// returning the app to a clean state as if it were freshly installed.
func (a *App) ClearLoadedProtos() {
	logger.Default.Infof("clearing all loaded protos")
	a.mu.Lock()
	old := a.protoset
	a.protoset = nil
	a.loadedProtosetPaths = nil
	a.loadedProtoFiles = nil
	a.loadImportPaths = nil
	a.loadReflection = false
	virtualDirs := a.virtualImportDirs
	a.virtualImportDirs = nil
	a.mu.Unlock()

	for _, d := range virtualDirs {
		os.RemoveAll(d)
	}

	if old != nil {
		go func() {
			time.Sleep(5 * time.Second)
			old.Close()
		}()
	}

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = ""
		s.ProtosetPaths = nil
		s.ProtoFilePaths = nil
		s.ProtoImportPaths = nil
	})
}

// ReloadProtos re-reads all currently saved proto/protoset files from disk.
// Use this when a .protoset has been regenerated at the same path — the
// in-memory descriptor is rebuilt from the latest file content.
func (a *App) ReloadProtos() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	virtualDirs := append([]string(nil), a.virtualImportDirs...)
	a.mu.Unlock()

	if len(protosets) == 0 && len(protoFiles) == 0 && !withReflection {
		logger.Default.Errorf("reload protos failed: nothing to reload")
		return nil, fmt.Errorf("nothing to reload")
	}
	logger.Default.Infof("reloading protos")
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := a.rebuildDescriptor(a.ctx, protosets, effectivePaths, protoFiles, withReflection, conn)
	if err != nil {
		logger.Default.Errorf("reload protos failed: %v", err)
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, importPaths, protoFiles, withReflection)
	logger.Default.Infof("protos reloaded: %d service(s)", len(pd.Services()))
	return pd.Services(), nil
}

// RemoveProtoPath removes one path from the loaded set and reloads the rest.
// If the removed path was the only one, this is equivalent to ClearLoadedProtos.
func (a *App) RemoveProtoPath(path string) ([]rpc.ServiceInfo, error) {
	logger.Default.Infof("removing proto path: %s", path)
	a.mu.Lock()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	virtualDirs := append([]string(nil), a.virtualImportDirs...)
	a.mu.Unlock()

	var remainingProtosets []string
	for _, p := range protosets {
		if p != path {
			remainingProtosets = append(remainingProtosets, p)
		}
	}
	var remainingProtoFiles []string
	for _, p := range protoFiles {
		if p != path {
			remainingProtoFiles = append(remainingProtoFiles, p)
		}
	}

	if len(remainingProtosets) == 0 && len(remainingProtoFiles) == 0 && !withReflection {
		a.ClearLoadedProtos()
		return []rpc.ServiceInfo{}, nil
	}
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := a.rebuildDescriptor(a.ctx, remainingProtosets, effectivePaths, remainingProtoFiles, withReflection, conn)
	if err != nil {
		logger.Default.Errorf("remove proto path %q rebuild failed: %v", path, err)
		return nil, err
	}
	a.storeDescriptorState(pd, remainingProtosets, importPaths, remainingProtoFiles, withReflection)

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = remainingProtosets
		s.ProtoFilePaths = remainingProtoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

func (a *App) currentLoadMode() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.currentLoadModeLocked()
}

// GetServices returns the service/method tree from the loaded descriptor.
func (a *App) GetServices() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		logger.Default.Errorf("get services failed: no descriptor loaded")
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.Services(), nil
}

// GetRequestSchema returns the field schemas for the input message of a method.
func (a *App) GetRequestSchema(methodPath string) ([]rpc.FieldSchema, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		logger.Default.Errorf("get request schema %s failed: no descriptor loaded", methodPath)
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.GetRequestSchema(methodPath)
}
