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

// Registers a one-shot observer that sets NSWindowCollectionBehaviorFullScreenPrimary
// the first time the main window becomes key (guaranteed before user can click traffic lights).
void enableWindowFullscreenButton() {
    dispatch_async(dispatch_get_main_queue(), ^{
        id __block token;
        token = [[NSNotificationCenter defaultCenter]
            addObserverForName:NSWindowDidBecomeKeyNotification
                        object:nil
                         queue:[NSOperationQueue mainQueue]
                    usingBlock:^(NSNotification *note) {
            NSWindow *win = (NSWindow *)note.object;
            NSWindowCollectionBehavior b = [win collectionBehavior];
            b |= NSWindowCollectionBehaviorFullScreenPrimary;
            b |= NSWindowCollectionBehaviorManaged;
            [win setCollectionBehavior:b];
            [[NSNotificationCenter defaultCenter] removeObserver:token];
        }];
    });
}
*/
import "C"

func init() {
C.disableAutomaticWindowTabbing()
C.enableWindowFullscreenButton()
}

// EnableWindowFullscreenButton is a no-op; work happens in init() via notification observer.
func EnableWindowFullscreenButton() {}
