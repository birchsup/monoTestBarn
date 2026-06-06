package db

import (
	"errors"

	"github.com/jackc/pgconn"
)

// ErrConflict signals a referential-integrity conflict (FK RESTRICT violation),
// which the API layer maps to HTTP 409.
var ErrConflict = errors.New("operation conflicts with existing references")

// ErrSuiteCaseLinkNotFound is returned when a suite-case link to delete does not exist.
var ErrSuiteCaseLinkNotFound = errors.New("suite-case link not found")

// isForeignKeyViolation reports whether err is a Postgres foreign-key violation (SQLSTATE 23503).
func isForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23503"
	}
	return false
}
