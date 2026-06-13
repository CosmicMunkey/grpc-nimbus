# gripmock — gRPC Mock Server

This directory contains everything needed to spin up a real gRPC mock server
using [bavix/gripmock](https://github.com/bavix/gripmock) via Docker Compose.

## Directory Layout

```
gripmock/
├── proto/
│   └── nimbus.proto      ← Single comprehensive proto (4 services, all gRPC patterns)
└── stubs/
    ├── greeting/
    │   ├── say_hello.json
    │   └── say_hello_stream.json
    ├── user/
    │   ├── create_user.json
    │   ├── get_user.json
    │   ├── list_users.json
    │   └── delete_user.json
    ├── inventory/
    │   ├── get_item.json
    │   └── search_items.json
    └── health/
        └── check.json
```

## Services in `nimbus.proto`

| Service            | RPCs                                                              | Patterns              |
|--------------------|-------------------------------------------------------------------|-----------------------|
| `GreetingService`  | `SayHello`, `SayHelloStream`                                      | Unary, server-stream  |
| `UserService`      | `CreateUser`, `GetUser`, `UpdateUser`, `DeleteUser`, `ListUsers`, `WatchUser`, `BatchCreateUsers`, `Chat` | Unary, server-stream, client-stream, bidi-stream |
| `InventoryService` | `GetItem`, `SearchItems`, `UpdateStock`                           | Unary                 |
| `HealthService`    | `Check`, `Watch`                                                  | Unary, server-stream  |

## Starting the Server

From the `test/` directory:

```bash
docker compose up
```

- **gRPC endpoint**: `localhost:4770`
- **Admin UI / stub browser**: `http://localhost:4771`
- **Health readiness**: `http://localhost:4771/api/health/readiness`

## Calling the Mock (grpcurl)

Install [grpcurl](https://github.com/fullstorydev/grpcurl) if you haven't already, then:

```bash
# Health check
grpcurl -plaintext -proto test/gripmock/proto/nimbus.proto \
  -d '{"service": ""}' \
  localhost:4770 nimbus.v1.HealthService/Check

# Get a user
grpcurl -plaintext -proto test/gripmock/proto/nimbus.proto \
  -d '{"id": "usr_01HXYZ1234ABCDEF"}' \
  localhost:4770 nimbus.v1.UserService/GetUser

# Say hello
grpcurl -plaintext -proto test/gripmock/proto/nimbus.proto \
  -d '{"name": "World", "locale": "en-US"}' \
  localhost:4770 nimbus.v1.GreetingService/SayHello

# Search inventory
grpcurl -plaintext -proto test/gripmock/proto/nimbus.proto \
  -d '{"query": "headphones", "category": "ITEM_CATEGORY_ELECTRONICS", "max_price": 500.0, "in_stock_only": true, "page": {"page_size": 10}}' \
  localhost:4770 nimbus.v1.InventoryService/SearchItems
```

## Adding New Stubs

Drop a new `.json` file into the appropriate `stubs/<service>/` directory.
GripMock loads all stubs at startup. The stub schema is:

```json
{
  "$schema": "https://bavix.github.io/gripmock/schema/stub.json",
  "service": "ServiceName",
  "method": "MethodName",
  "input": {
    "equals": { ... }
  },
  "output": {
    "data": { ... }
  }
}
```

Input matching supports `equals`, `contains`, and `matches` (regex).
You can also return errors with `"output": { "error": "some error message" }`.
