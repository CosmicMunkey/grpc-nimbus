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
*/
import "C"

func init() {
	C.disableAutomaticWindowTabbing()
}
