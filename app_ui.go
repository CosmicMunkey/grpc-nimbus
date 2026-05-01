package main

import (
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PickDirectory opens a native folder picker dialog.
// Returns the selected directory path, or empty string if cancelled.
func (a *App) PickDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Import Path Directory",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// PickProtosetFiles opens a native multi-file dialog filtered for .protoset files.
// Returns selected file paths (empty slice if cancelled).
func (a *App) PickProtosetFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Protoset Files",
		Filters: []runtime.FileFilter{
			{DisplayName: "Protoset Files (*.protoset;*.pb;*.bin)", Pattern: "*.protoset;*.pb;*.bin"},
			{DisplayName: "All Files", Pattern: "*"},
		},
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// PickProtoFiles opens a native multi-file dialog filtered for .proto files.
func (a *App) PickProtoFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Proto Files",
		Filters: []runtime.FileFilter{{DisplayName: "Proto Files (*.proto)", Pattern: "*.proto"}},
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// PickImportFile opens a native file dialog to select a collection JSON file for import.
func (a *App) PickImportFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Import Collection",
		Filters: []runtime.FileFilter{{DisplayName: "JSON Files (*.json)", Pattern: "*.json"}},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// PickExportPath opens a native save dialog to choose a destination for exporting a collection.
func (a *App) PickExportPath(defaultName string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Collection",
		DefaultFilename: defaultName,
		Filters:         []runtime.FileFilter{{DisplayName: "JSON Files (*.json)", Pattern: "*.json"}},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// TriggerMenuImport emits an event that tells the frontend to start an import flow.
// Called from the native File menu.
func (a *App) TriggerMenuImport() {
	runtime.EventsEmit(a.ctx, "menu:importCollection")
}

// TriggerMenuExport emits an event that tells the frontend to open the export picker.
// Called from the native File menu.
func (a *App) TriggerMenuExport() {
	runtime.EventsEmit(a.ctx, "menu:exportCollection")
}

// TriggerMenuToggleFullscreen toggles the window between fullscreen and normal.
func (a *App) TriggerMenuToggleFullscreen() {
	if runtime.WindowIsFullscreen(a.ctx) {
		runtime.WindowUnfullscreen(a.ctx)
	} else {
		runtime.WindowFullscreen(a.ctx)
	}
}

// TriggerMenuZoomIn tells the frontend to increase the UI text size.
func (a *App) TriggerMenuZoomIn() { runtime.EventsEmit(a.ctx, "menu:zoomIn") }

// TriggerMenuZoomOut tells the frontend to decrease the UI text size.
func (a *App) TriggerMenuZoomOut() { runtime.EventsEmit(a.ctx, "menu:zoomOut") }

// TriggerMenuZoomReset tells the frontend to restore the default text size.
func (a *App) TriggerMenuZoomReset() { runtime.EventsEmit(a.ctx, "menu:zoomReset") }

// TriggerMenuNewTab tells the frontend to open a new request tab.
func (a *App) TriggerMenuNewTab() { runtime.EventsEmit(a.ctx, "menu:newTab") }

// TriggerMenuCloseTab tells the frontend to close the active tab.
func (a *App) TriggerMenuCloseTab() { runtime.EventsEmit(a.ctx, "menu:closeTab") }

// TriggerMenuNextTab tells the frontend to switch to the next tab.
func (a *App) TriggerMenuNextTab() { runtime.EventsEmit(a.ctx, "menu:nextTab") }

// TriggerMenuPrevTab tells the frontend to switch to the previous tab.
func (a *App) TriggerMenuPrevTab() { runtime.EventsEmit(a.ctx, "menu:prevTab") }

// TriggerMenuAbout opens the About dialog in the frontend.
func (a *App) TriggerMenuAbout() { runtime.EventsEmit(a.ctx, "menu:about") }

// TriggerMenuHelp opens the searchable Help dialog in the frontend.
func (a *App) TriggerMenuHelp() { runtime.EventsEmit(a.ctx, "menu:help") }

// TriggerMenuCloseAllTabs tells the frontend to close all tabs and open a fresh one.
func (a *App) TriggerMenuCloseAllTabs() { runtime.EventsEmit(a.ctx, "menu:closeAllTabs") }
