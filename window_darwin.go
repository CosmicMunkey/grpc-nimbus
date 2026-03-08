//go:build darwin

package main

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa
#import <Cocoa/Cocoa.h>

void disableAutomaticWindowTabbing() {
    if (@available(macOS 10.12, *)) {
        [NSWindow setAllowsAutomaticWindowTabbing:NO];
    }
}

// Called after the Wails window is ready to enable the green traffic-light
// button for native fullscreen. Uses dispatch_after so the window exists.
void enableWindowFullscreenButton() {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)),
                   dispatch_get_main_queue(), ^{
        NSWindow *win = [[NSApplication sharedApplication] mainWindow];
        if (win != nil) {
            [win setCollectionBehavior:
                [win collectionBehavior] |
                NSWindowCollectionBehaviorFullScreenPrimary |
                NSWindowCollectionBehaviorManaged];
        }
    });
}
*/
import "C"

func init() {
	C.disableAutomaticWindowTabbing()
}

// EnableWindowFullscreenButton is called from app.startup (after ctx is set)
// so the window exists by the time the ObjC runs.
func EnableWindowFullscreenButton() {
	C.enableWindowFullscreenButton()
}
