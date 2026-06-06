# testBarn

## Run backend + database in Docker

```bash
docker compose up --build
```

This starts:
- `db` (PostgreSQL)
- `migrate` (applies SQL migrations)
- `backend` (Go API on port `8080`)

API URL:
- `http://localhost:8080`

## Run tests

```bash
go test -v ./...
```

Integration tests use `testcontainers-go` and start their own PostgreSQL container.
Make sure your local Docker daemon is running before executing `go test`.

## Stop everything

```bash
docker compose down -v
```
