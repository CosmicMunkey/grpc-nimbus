//go:build !darwin

package main

// EnableWindowFullscreenButton is a no-op on non-macOS platforms.
func EnableWindowFullscreenButton() {}
