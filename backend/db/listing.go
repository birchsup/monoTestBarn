package db

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// ListOptions carries validated pagination/sort parameters from the API layer.
type ListOptions struct {
	Limit  int
	Offset int
	SortBy string
	Order  string // "asc" | "desc"
}

func (o ListOptions) orderClause(allowed map[string]string, fallbackCol string) string {
	col, ok := allowed[o.SortBy]
	if !ok {
		col = fallbackCol
	}
	order := "DESC"
	if strings.EqualFold(o.Order, "asc") {
		order = "ASC"
	}
	// Stable tiebreaker on id keeps pages deterministic.
	if col == "id" {
		return fmt.Sprintf("ORDER BY %s %s", col, order)
	}
	return fmt.Sprintf("ORDER BY %s %s, id %s", col, order, order)
}

// TestCaseFilter filters the test case list.
type TestCaseFilter struct {
	Search string // ILIKE match against test::text
}

// TestSuiteFilter filters the test suite list.
type TestSuiteFilter struct {
	Name string // ILIKE match against name
}

// TestRunFilter filters the test run list.
type TestRunFilter struct {
	SuiteID  *int
	DateFrom *time.Time
	DateTo   *time.Time
}

// GetTestCases returns a filtered/sorted/paginated page of test cases plus the total count.
func GetTestCases(opts ListOptions, filter TestCaseFilter) ([]TestCase, int, error) {
	ctx := context.Background()

	var conds []string
	var args []interface{}
	if s := strings.TrimSpace(filter.Search); s != "" {
		args = append(args, "%"+s+"%")
		conds = append(conds, fmt.Sprintf("test::text ILIKE $%d", len(args)))
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := DBPool.QueryRow(ctx, "SELECT COUNT(*) FROM test_cases "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := opts.orderClause(map[string]string{"id": "id"}, "id")
	args = append(args, opts.Limit, opts.Offset)
	query := fmt.Sprintf("SELECT id, test FROM test_cases %s %s LIMIT $%d OFFSET $%d",
		where, order, len(args)-1, len(args))

	rows, err := DBPool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	testCases := make([]TestCase, 0)
	for rows.Next() {
		var tc TestCase
		if err := rows.Scan(&tc.ID, &tc.Test); err != nil {
			return nil, 0, err
		}
		testCases = append(testCases, tc)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return testCases, total, nil
}

// GetTestSuites returns a filtered/sorted/paginated page of test suites plus the total count.
func GetTestSuites(opts ListOptions, filter TestSuiteFilter) ([]TestSuite, int, error) {
	ctx := context.Background()

	var conds []string
	var args []interface{}
	if n := strings.TrimSpace(filter.Name); n != "" {
		args = append(args, "%"+n+"%")
		conds = append(conds, fmt.Sprintf("name ILIKE $%d", len(args)))
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := DBPool.QueryRow(ctx, "SELECT COUNT(*) FROM test_suites "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := opts.orderClause(map[string]string{
		"id":         "id",
		"name":       "name",
		"created_at": "created_at",
	}, "created_at")
	args = append(args, opts.Limit, opts.Offset)
	query := fmt.Sprintf("SELECT id, name, description, created_at FROM test_suites %s %s LIMIT $%d OFFSET $%d",
		where, order, len(args)-1, len(args))

	rows, err := DBPool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	testSuites := make([]TestSuite, 0)
	for rows.Next() {
		var ts TestSuite
		if err := rows.Scan(&ts.ID, &ts.Name, &ts.Description, &ts.CreatedAt); err != nil {
			return nil, 0, err
		}
		testSuites = append(testSuites, ts)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return testSuites, total, nil
}

// GetTestRuns returns a filtered/sorted/paginated page of test runs plus the total count.
func GetTestRuns(opts ListOptions, filter TestRunFilter) ([]TestRun, int, error) {
	ctx := context.Background()

	var conds []string
	var args []interface{}
	if filter.SuiteID != nil {
		args = append(args, *filter.SuiteID)
		conds = append(conds, fmt.Sprintf("suite_id = $%d", len(args)))
	}
	if filter.DateFrom != nil {
		args = append(args, *filter.DateFrom)
		conds = append(conds, fmt.Sprintf("created_at >= $%d", len(args)))
	}
	if filter.DateTo != nil {
		args = append(args, *filter.DateTo)
		conds = append(conds, fmt.Sprintf("created_at <= $%d", len(args)))
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := DBPool.QueryRow(ctx, "SELECT COUNT(*) FROM test_runs "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := opts.orderClause(map[string]string{
		"id":         "id",
		"created_at": "created_at",
	}, "created_at")
	args = append(args, opts.Limit, opts.Offset)
	query := fmt.Sprintf("SELECT id, suite_id, run_details, created_at FROM test_runs %s %s LIMIT $%d OFFSET $%d",
		where, order, len(args)-1, len(args))

	rows, err := DBPool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	runs := make([]TestRun, 0)
	for rows.Next() {
		var run TestRun
		if err := rows.Scan(&run.ID, &run.SuiteID, &run.RunDetails, &run.CreatedAt); err != nil {
			return nil, 0, err
		}
		runs = append(runs, run)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return runs, total, nil
}
