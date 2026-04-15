package rpc

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"net"
	"path/filepath"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	grpcencoding "google.golang.org/grpc/encoding"
	"google.golang.org/grpc/mem"
	"google.golang.org/protobuf/encoding/protowire"
)

func init() {
	// Override the global "proto" CodecV2 to also support *[]byte pass-through.
	// This lets test servers receive and send raw protobuf bytes without needing
	// generated Go types. All other types are delegated to the original codec.
	original := grpcencoding.GetCodecV2("proto")
	grpcencoding.RegisterCodecV2(&rawBytesCodecV2{delegate: original})
}

// rawBytesCodecV2 is a gRPC CodecV2 that passes bytes through for *[]byte/[]byte
// and delegates to the standard proto codec for everything else.
type rawBytesCodecV2 struct {
	delegate grpcencoding.CodecV2
}

func (*rawBytesCodecV2) Name() string { return "proto" }

func (c *rawBytesCodecV2) Marshal(v any) (mem.BufferSlice, error) {
	if b, ok := v.([]byte); ok {
		return mem.BufferSlice{mem.SliceBuffer(b)}, nil
	}
	return c.delegate.Marshal(v)
}

func (c *rawBytesCodecV2) Unmarshal(data mem.BufferSlice, v any) error {
	if b, ok := v.(*[]byte); ok {
		*b = data.Materialize()
		return nil
	}
	return c.delegate.Unmarshal(data, v)
}

// startPingServer starts a gRPC server implementing PingService/Ping over TLS.
// The handler echoes the "message" field from the request back in the response.
// Returns the server address.
func startPingServer(t *testing.T, serverCfg *tls.Config) string {
	t.Helper()

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	srv := grpc.NewServer(
		grpc.Creds(credentials.NewTLS(serverCfg)),
		grpc.UnknownServiceHandler(func(_ interface{}, stream grpc.ServerStream) error {
			var req []byte
			if err := stream.RecvMsg(&req); err != nil {
				return err
			}
			msg := decodeSingleStringField(req)
			resp := protowire.AppendTag(nil, 1, protowire.BytesType)
			resp = protowire.AppendString(resp, msg)
			return stream.SendMsg(resp)
		}),
	)
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.GracefulStop)
	return lis.Addr().String()
}

// decodeSingleStringField extracts field 1 (string) from a serialised protobuf
// message. Used to decode PingRequest without generated Go types.
func decodeSingleStringField(b []byte) string {
	for len(b) > 0 {
		num, typ, n := protowire.ConsumeTag(b)
		if n < 0 {
			break
		}
		b = b[n:]
		if num == 1 && typ == protowire.BytesType {
			s, n := protowire.ConsumeString(b)
			if n >= 0 {
				return s
			}
		}
		n = protowire.ConsumeFieldValue(num, typ, b)
		if n < 0 {
			break
		}
		b = b[n:]
	}
	return ""
}

// loadPingDescriptor loads the PingService proto descriptor from the test fixture.
func loadPingDescriptor(t *testing.T) *ProtosetDescriptor {
	t.Helper()
	protoRoot, err := filepath.Abs(filepath.Join("testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve proto root: %v", err)
	}
	protoFile := filepath.Join(protoRoot, "no_includes_needed.proto")
	pd, err := LoadProtoFiles([]string{protoRoot}, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}
	return pd
}

// TestInvokeUnaryOverTLSInsecureSkip sends a real unary RPC over a TLS
// connection with cert verification disabled and checks the echoed response.
func TestInvokeUnaryOverTLSInsecureSkip(t *testing.T) {
	serverCfg, _ := selfSignedTLS(t)
	addr := startPingServer(t, serverCfg)
	pd := loadPingDescriptor(t)

	conn, err := NewConnection(context.Background(), ConnectionConfig{
		Target: addr,
		TLS:    TLSModeInsecureSkip,
	})
	if err != nil {
		t.Fatalf("NewConnection: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	resp, err := InvokeUnary(context.Background(), conn, pd, InvokeRequest{
		MethodPath:  "sample.v1.PingService/Ping",
		RequestJSON: `{"message": "hello-tls"}`,
	})
	if err != nil {
		t.Fatalf("InvokeUnary: %v", err)
	}
	if resp.Error != "" {
		t.Fatalf("RPC error: %s", resp.Error)
	}
	if resp.StatusCode != 0 {
		t.Errorf("expected OK status, got %s (%d): %s", resp.Status, resp.StatusCode, resp.StatusMessage)
	}
	if resp.ResponseJSON == "" {
		t.Error("expected non-empty response JSON")
	}
	t.Logf("response: %s", resp.ResponseJSON)
}

// TestInvokeUnaryOverTLSSystemCA sends a unary RPC over TLS with a custom CA
// pool that trusts the self-signed cert, simulating a real CA-issued cert.
func TestInvokeUnaryOverTLSSystemCA(t *testing.T) {
	serverCfg, caPEM := selfSignedTLS(t)
	addr := startPingServer(t, serverCfg)
	pd := loadPingDescriptor(t)

	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caPEM) {
		t.Fatal("failed to parse CA PEM")
	}
	opts, err := buildDialOptions(ConnectionConfig{Target: addr, TLS: TLSModeSystem})
	if err != nil {
		t.Fatalf("buildDialOptions: %v", err)
	}
	opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{
		RootCAs:    pool,
		ServerName: "localhost",
	})))

	cc, err := grpc.NewClient(addr, opts...)
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	t.Cleanup(func() { _ = cc.Close() })

	resp, err := InvokeUnary(context.Background(), &Connection{conn: cc}, pd, InvokeRequest{
		MethodPath:  "sample.v1.PingService/Ping",
		RequestJSON: `{"message": "hello-ca"}`,
	})
	if err != nil {
		t.Fatalf("InvokeUnary: %v", err)
	}
	if resp.Error != "" {
		t.Fatalf("RPC error: %s", resp.Error)
	}
	if resp.StatusCode != 0 {
		t.Errorf("expected OK status, got %s (%d): %s", resp.Status, resp.StatusCode, resp.StatusMessage)
	}
	t.Logf("response: %s", resp.ResponseJSON)
}

// TestInvokeUnaryTLSRejectsUntrustedCert verifies that a TLS connection with
// strict cert verification fails to invoke RPCs against an untrusted cert.
func TestInvokeUnaryTLSRejectsUntrustedCert(t *testing.T) {
	serverCfg, _ := selfSignedTLS(t)
	addr := startPingServer(t, serverCfg)
	pd := loadPingDescriptor(t)

	conn, err := NewConnection(context.Background(), ConnectionConfig{
		Target: addr,
		TLS:    TLSModeSystem,
	})
	if err != nil {
		t.Fatalf("NewConnection: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	// Wait for the TLS handshake to fail so the connection settles into
	// TransientFailure before we try to invoke — otherwise gRPC's lazy dial
	// may not have surfaced the certificate error yet.
	cc := conn.ClientConn()
	waitCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for state := cc.GetState(); state == connectivity.Idle || state == connectivity.Connecting; state = cc.GetState() {
		if !cc.WaitForStateChange(waitCtx, state) {
			break
		}
	}

	resp, err := InvokeUnary(context.Background(), conn, pd, InvokeRequest{
		MethodPath:  "sample.v1.PingService/Ping",
		RequestJSON: `{"message": "should-fail"}`,
	})
	// A hard error, a non-empty resp.Error, or a non-OK status all indicate
	// the call was correctly rejected (expected for an untrusted self-signed cert).
	if err == nil && resp.Error == "" && resp.Status == "OK" {
		t.Error("expected TLS error when calling over untrusted cert, got success")
	}
	t.Logf("correctly rejected (err=%v resp.Error=%s resp.Status=%s)", err, resp.Error, resp.Status)
}

// TestInvokeUnaryMetadataSentOverTLS verifies that request metadata (headers)
// are accepted and the RPC completes successfully over a TLS connection.
func TestInvokeUnaryMetadataSentOverTLS(t *testing.T) {
	serverCfg, _ := selfSignedTLS(t)
	addr := startPingServer(t, serverCfg)
	pd := loadPingDescriptor(t)

	conn, err := NewConnection(context.Background(), ConnectionConfig{
		Target: addr,
		TLS:    TLSModeInsecureSkip,
	})
	if err != nil {
		t.Fatalf("NewConnection: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	resp, err := InvokeUnary(context.Background(), conn, pd, InvokeRequest{
		MethodPath:  "sample.v1.PingService/Ping",
		RequestJSON: `{"message": "meta-test"}`,
		Metadata: []MetadataEntry{
			{Key: "authorization", Value: "Bearer test-token"},
		},
	})
	if err != nil {
		t.Fatalf("InvokeUnary: %v", err)
	}
	if resp.Error != "" {
		t.Fatalf("RPC error: %s", resp.Error)
	}
	if resp.StatusCode != 0 {
		t.Errorf("expected OK status, got %s (%d)", resp.Status, resp.StatusCode)
	}
}
