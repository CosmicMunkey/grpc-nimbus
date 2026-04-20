.PHONY: build dev clean mcp

# Strip macOS extended attributes (iCloud/Finder detritus) before building
# to avoid codesign failures on local machines.
build:
	@if [ -d "build/bin/GRPC Nimbus.app" ]; then \
		xattr -cr "build/bin/GRPC Nimbus.app"; \
	fi
	wails build

dev:
	wails dev

# Build the standalone MCP server binary.
mcp:
	go build -o bin/grpc-nimbus-mcp ./cmd/mcp-server

clean:
	rm -rf build/bin bin
