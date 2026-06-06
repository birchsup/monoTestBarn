package api

import (
	"net/http"
	"os"
	"strconv"
	"strings"
)

// Pagination defaults, overridable via env (DB / Infra #5).
func defaultPageSize() int {
	return envInt("DEFAULT_PAGE_SIZE", 50)
}

func maxPageSize() int {
	return envInt("MAX_PAGE_SIZE", 200)
}

func envInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

// listQuery holds the parsed pagination/sort parameters shared by all list endpoints.
type listQuery struct {
	Limit  int
	Offset int
	SortBy string
	Order  string // "asc" | "desc"
}

// parseListQuery validates limit/offset/sort_by/order against the allowed sort
// columns. The first entry of allowedSort is the default sort column.
func parseListQuery(w http.ResponseWriter, r *http.Request, allowedSort []string) (listQuery, bool) {
	q := listQuery{
		Limit:  defaultPageSize(),
		Offset: 0,
		SortBy: allowedSort[0],
		Order:  "desc",
	}

	query := r.URL.Query()

	if raw := strings.TrimSpace(query.Get("limit")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			writeInvalidQueryParam(w, "limit", raw)
			return listQuery{}, false
		}
		if n > maxPageSize() {
			n = maxPageSize()
		}
		q.Limit = n
	}

	if raw := strings.TrimSpace(query.Get("offset")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			writeInvalidQueryParam(w, "offset", raw)
			return listQuery{}, false
		}
		q.Offset = n
	}

	if raw := strings.TrimSpace(query.Get("sort_by")); raw != "" {
		if !contains(allowedSort, raw) {
			writeInvalidQueryParam(w, "sort_by", raw)
			return listQuery{}, false
		}
		q.SortBy = raw
	}

	if raw := strings.TrimSpace(query.Get("order")); raw != "" {
		order := strings.ToLower(raw)
		if order != "asc" && order != "desc" {
			writeInvalidQueryParam(w, "order", raw)
			return listQuery{}, false
		}
		q.Order = order
	}

	return q, true
}

func contains(values []string, target string) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

// writePaginationHeaders exposes pagination metadata while keeping the response
// body a plain JSON array (backward compatible).
func writePaginationHeaders(w http.ResponseWriter, total, limit, offset int) {
	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	w.Header().Set("X-Limit", strconv.Itoa(limit))
	w.Header().Set("X-Offset", strconv.Itoa(offset))
}

func writeInvalidQueryParam(w http.ResponseWriter, param string, value string) {
	writeError(w, http.StatusBadRequest, "invalid_query_param", "Invalid "+param, map[string]interface{}{
		"param": param,
		"value": value,
	})
}
