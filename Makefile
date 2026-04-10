.PHONY: build dev clean

# Strip macOS extended attributes (iCloud/Finder detritus) before building
# to avoid codesign failures on local machines.
build:
	@if [ -d "build/bin/GRPC Nimbus.app" ]; then \
		xattr -cr "build/bin/GRPC Nimbus.app"; \
	fi
	wails build

dev:
	wails dev

clean:
	rm -rf build/bin
