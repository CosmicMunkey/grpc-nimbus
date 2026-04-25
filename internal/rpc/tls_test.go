package rpc

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
)

// selfSignedTLS generates an in-memory self-signed cert for localhost and returns
// a server TLS config and the PEM-encoded cert (used as the CA for trusted tests).
func selfSignedTLS(t *testing.T) (serverCfg *tls.Config, caPEM []byte) {
	t.Helper()

	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "localhost"},
		DNSNames:     []string{"localhost"},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(24 * time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &priv.PublicKey, priv)
	if err != nil {
		t.Fatalf("create cert: %v", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	keyDER, err := x509.MarshalECPrivateKey(priv)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		t.Fatalf("key pair: %v", err)
	}

	return &tls.Config{Certificates: []tls.Certificate{tlsCert}}, certPEM
}

// startTLSServer starts a bare gRPC server with TLS on a random port and returns
// the address. Cleanup is registered via t.Cleanup.
func startTLSServer(t *testing.T, serverCfg *tls.Config) string {
	t.Helper()

	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	srv := grpc.NewServer(grpc.Creds(credentials.NewTLS(serverCfg)))
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.GracefulStop)

	return lis.Addr().String()
}

// waitReady dials with the given options and waits up to 3s for the connection
// to leave Idle/Connecting, returning the final state.
func waitReady(t *testing.T, addr string, opts []grpc.DialOption) connectivity.State {
	t.Helper()

	cc, err := grpc.NewClient(addr, opts...)
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	t.Cleanup(func() { _ = cc.Close() })

	cc.Connect()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	state := cc.GetState()
	for state == connectivity.Idle || state == connectivity.Connecting {
		if !cc.WaitForStateChange(ctx, state) {
			break
		}
		state = cc.GetState()
	}
	return state
}

// TestTLSSystemRejectsUntrustedCert verifies TLSModeSystem rejects a self-signed
// cert — i.e. certificate validation is actually happening.
func TestTLSSystemRejectsUntrustedCert(t *testing.T) {
	serverCfg, _ := selfSignedTLS(t)
	addr := startTLSServer(t, serverCfg)

	opts, err := buildDialOptions(ConnectionConfig{Target: addr, TLS: TLSModeSystem})
	if err != nil {
		t.Fatalf("buildDialOptions: %v", err)
	}

	state := waitReady(t, addr, opts)
	if state == connectivity.Ready {
		t.Errorf("TLSModeSystem: connected to untrusted self-signed cert — cert validation not working")
	}
	t.Logf("TLSModeSystem correctly rejected untrusted cert (state=%v)", state)
}

// TestTLSSystemTrustedCA verifies TLSModeSystem succeeds when the server cert
// is signed by a CA in the client's trusted pool.
func TestTLSSystemTrustedCA(t *testing.T) {
	serverCfg, caPEM := selfSignedTLS(t)
	addr := startTLSServer(t, serverCfg)

	opts, err := buildDialOptions(ConnectionConfig{Target: addr, TLS: TLSModeSystem})
	if err != nil {
		t.Fatalf("buildDialOptions: %v", err)
	}

	// Override system pool with a custom pool containing our self-signed CA,
	// simulating a trusted certificate without touching the OS cert store.
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caPEM) {
		t.Fatal("failed to parse CA PEM")
	}
	opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{
		RootCAs:    pool,
		ServerName: "localhost",
	})))

	if state := waitReady(t, addr, opts); state != connectivity.Ready {
		t.Errorf("trusted CA: want Ready, got %v — TLS handshake failed with matching CA", state)
	}
}
