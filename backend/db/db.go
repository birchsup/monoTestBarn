package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/jackc/pgx/v4/pgxpool"
	"log"
	"os"
)

var DBPool *pgxpool.Pool

func InitDB() {
	var err error
	DBPool, err = pgxpool.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
}

type TestCase struct {
	ID        int64           `json:"id"`
	Test      json.RawMessage `json:"test"`
	SuiteID   sql.NullInt64   `json:"suite_id"`
	SuiteName sql.NullString  `json:"suite_name"`
}

func CreateTestCaseInDB(testCase TestCase) (int64, error) {
	var id int64
	err := DBPool.QueryRow(context.Background(), "INSERT INTO test_cases (test) VALUES ($1) RETURNING id", testCase.Test).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func GetTestCaseFromDB(id int64) (TestCase, error) {
	var testCase TestCase
	query := `
		SELECT tc.id, tc.test, tsc.suite_id, ts.name
		FROM test_cases tc
		LEFT JOIN test_suite_cases tsc ON tc.id = tsc.case_id
		LEFT JOIN test_suites ts ON tsc.suite_id = ts.id
		WHERE tc.id=$1`
	err := DBPool.QueryRow(context.Background(), query, id).Scan(&testCase.ID, &testCase.Test, &testCase.SuiteID, &testCase.SuiteName)
	if err != nil {
		return testCase, err
	}
	return testCase, nil
}

func UpdateTestCaseInDB(id int64, updatedTest json.RawMessage) error {
	tag, err := DBPool.Exec(context.Background(), "UPDATE test_cases SET test=$1 WHERE id=$2", updatedTest, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrTestCaseNotFound
	}
	return nil
}

func DeleteTestCaseInDB(id int64) error {
	// test_suite_cases links are removed via ON DELETE CASCADE (migration 000004).
	// test_run_cases.case_id is RESTRICT, so deleting a case used by a run raises an
	// FK violation, which we surface as a 409 conflict.
	tag, err := DBPool.Exec(context.Background(), "DELETE FROM test_cases WHERE id=$1", id)
	if err != nil {
		if isForeignKeyViolation(err) {
			return ErrConflict
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrTestCaseNotFound
	}
	return nil
}
