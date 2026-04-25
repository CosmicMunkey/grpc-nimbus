package rpc

import (
	"context"
	"crypto/tls"
	"fmt"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// TLSMode controls how TLS is established on a connection.
type TLSMode string

const (
	TLSModeNone   TLSMode = "none"   // plaintext (h2c)
	TLSModeSystem TLSMode = "system" // TLS with system cert pool
)

// ConnectionConfig holds the parameters to connect to a gRPC server.
type ConnectionConfig struct {
	Target     string  `json:"target"`     // host:port
	TLS        TLSMode `json:"tls"`
	ClientCert string  `json:"clientCert"` // path to client cert (mTLS)
	ClientKey  string  `json:"clientKey"`  // path to client key (mTLS)
}

// Connection wraps a grpc.ClientConn with its config for reuse.
type Connection struct {
	Config ConnectionConfig
	conn   *grpc.ClientConn
	mu     sync.Mutex
}

// NewConnection dials the target described by cfg.
func NewConnection(ctx context.Context, cfg ConnectionConfig) (*Connection, error) {
	dialOpts, err := buildDialOptions(cfg)
	if err != nil {
		return nil, err
	}
	conn, err := grpc.NewClient(cfg.Target, dialOpts...)
	if err != nil {
		return nil, fmt.Errorf("dialing %s: %w", cfg.Target, err)
	}
	// Trigger the actual TCP handshake immediately so state reflects reality.
	conn.Connect()
	return &Connection{Config: cfg, conn: conn}, nil
}

// GetState returns the current connectivity state as a string.
// Possible values: "idle", "connecting", "ready", "transient_failure", "shutdown".
func (c *Connection) GetState() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		return "shutdown"
	}
	switch c.conn.GetState() {
	case connectivity.Idle:
		return "idle"
	case connectivity.Connecting:
		return "connecting"
	case connectivity.Ready:
		return "ready"
	case connectivity.TransientFailure:
		return "transient_failure"
	default:
		return "shutdown"
	}
}

// ClientConn returns the underlying *grpc.ClientConn.
func (c *Connection) ClientConn() *grpc.ClientConn {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn
}

// Close closes the underlying connection.
func (c *Connection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

func buildDialOptions(cfg ConnectionConfig) ([]grpc.DialOption, error) {
	switch cfg.TLS {
	case TLSModeNone:
		return []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}, nil

	case TLSModeSystem:
		tlsCfg := &tls.Config{}
		if err := applyClientCert(cfg, tlsCfg); err != nil {
			return nil, err
		}
		return []grpc.DialOption{grpc.WithTransportCredentials(credentials.NewTLS(tlsCfg))}, nil

	default:
		return nil, fmt.Errorf("unknown TLS mode %q", cfg.TLS)
	}
}

// applyClientCert loads the client keypair into the TLS config when paths are provided.
func applyClientCert(cfg ConnectionConfig, tlsCfg *tls.Config) error {
	if cfg.ClientCert == "" && cfg.ClientKey == "" {
		return nil
	}
	if cfg.ClientCert == "" || cfg.ClientKey == "" {
		return fmt.Errorf("both clientCert and clientKey must be provided for mTLS")
	}
	cert, err := tls.LoadX509KeyPair(cfg.ClientCert, cfg.ClientKey)
	if err != nil {
		return fmt.Errorf("loading client keypair: %w", err)
	}
	tlsCfg.Certificates = []tls.Certificate{cert}
	return nil
}
