package main

import (
	"context"
	"embed"
	goruntime "runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"grpc-nimbus/internal/storage"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Load saved window dimensions
	var windowWidth, windowHeight, windowX, windowY int
	settingsStore, err := storage.NewSettingsStore()
	if err == nil {
		if saved, err := settingsStore.Load(); err == nil && saved != nil {
			if saved.WindowWidth != nil {
				windowWidth = *saved.WindowWidth
			} else {
				windowWidth = 1280
			}
			if saved.WindowHeight != nil {
				windowHeight = *saved.WindowHeight
			} else {
				windowHeight = 800
			}
			if saved.WindowX != nil {
				windowX = *saved.WindowX
			}
			if saved.WindowY != nil {
				windowY = *saved.WindowY
			}
		} else {
			windowWidth = 1280
			windowHeight = 800
		}
	} else {
		windowWidth = 1280
		windowHeight = 800
	}

	// Create a startup wrapper that restores window position after init
	startupWithRestore := func(ctx context.Context) {
		app.startup(ctx)
		// Only restore position if non-zero (indicating a saved state)
		if windowX != 0 || windowY != 0 {
			runtime.WindowSetPosition(ctx, windowX, windowY)
		}
	}

	// Create application with options
	err = wails.Run(&options.App{
		Title:  "GRPC Nimbus",
		Width:  windowWidth,
		Height: windowHeight,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        startupWithRestore,
		OnBeforeClose:    func(ctx context.Context) bool { app.SaveWindowState(ctx); return false },
		Menu:             buildAppMenu(app),
		Linux: &linux.Options{
			Icon:             appIcon,
			WebviewGpuPolicy: linux.WebviewGpuPolicyOnDemand,
		},
		Bind: []any{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func buildAppMenu(app *App) *menu.Menu {
	m := menu.NewMenu()

	// On macOS add the standard application menu (About, Services, Hide, Quit…)
	if goruntime.GOOS == "darwin" {
		m.Append(menu.AppMenu())
	}

	fileMenu := m.AddSubmenu("File")
	fileMenu.AddText("Import Collection…", keys.CmdOrCtrl("i"), func(_ *menu.CallbackData) {
		app.TriggerMenuImport()
	})
	fileMenu.AddText("Export Collection…", keys.CmdOrCtrl("e"), func(_ *menu.CallbackData) {
		app.TriggerMenuExport()
	})

	// On macOS add the standard Edit menu so that Cut/Copy/Paste/Undo work
	// in every text field without any extra wiring.
	if goruntime.GOOS == "darwin" {
		m.Append(menu.EditMenu())
	}

	viewMenu := m.AddSubmenu("View")

	viewMenu.AddSeparator()

	// Text zoom
	viewMenu.AddText("Zoom In", keys.CmdOrCtrl("="), func(_ *menu.CallbackData) {
		app.TriggerMenuZoomIn()
	})
	viewMenu.AddText("Zoom Out", keys.CmdOrCtrl("-"), func(_ *menu.CallbackData) {
		app.TriggerMenuZoomOut()
	})
	viewMenu.AddText("Reset Zoom", keys.CmdOrCtrl("0"), func(_ *menu.CallbackData) {
		app.TriggerMenuZoomReset()
	})

	viewMenu.AddSeparator()

	// Tab management
	viewMenu.AddText("New Tab", keys.CmdOrCtrl("t"), func(_ *menu.CallbackData) {
		app.TriggerMenuNewTab()
	})
	viewMenu.AddText("Close Tab", keys.CmdOrCtrl("w"), func(_ *menu.CallbackData) {
		app.TriggerMenuCloseTab()
	})
	viewMenu.AddText("Next Tab", keys.Combo("Tab", keys.ControlKey, keys.OptionOrAltKey), func(_ *menu.CallbackData) {
		app.TriggerMenuNextTab()
	})
	viewMenu.AddText("Previous Tab", keys.Combo("Tab", keys.ControlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		app.TriggerMenuPrevTab()
	})

	helpMenu := m.AddSubmenu("Help")
	helpMenu.AddText("Documentation", keys.Combo("/", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		app.TriggerMenuHelp()
	})
	helpMenu.AddSeparator()
	helpMenu.AddText("About GRPC Nimbus", nil, func(_ *menu.CallbackData) {
		app.TriggerMenuAbout()
	})

	return m
}
