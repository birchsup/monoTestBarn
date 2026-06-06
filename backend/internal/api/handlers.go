package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"testBarn/db"

	"github.com/gorilla/mux"
)

func CreateTestCase(w http.ResponseWriter, r *http.Request) {
	var testCase db.TestCase
	if err := json.NewDecoder(r.Body).Decode(&testCase); err != nil {
		writeInvalidJSON(w, err)
		return
	}

	id, err := db.CreateTestCaseInDB(testCase)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	testCase.ID = id
	writeJSON(w, http.StatusOK, testCase)
}

func GetTestCaseHandler(w http.ResponseWriter, r *http.Request) {
	testCaseID := mux.Vars(r)["id"]
	if testCaseID == "" {
		writeMissingPathParam(w, "test case ID")
		return
	}

	id, err := strconv.ParseInt(testCaseID, 10, 64)
	if err != nil || id <= 0 {
		writeInvalidPathParam(w, "test case ID", testCaseID)
		return
	}

	testCase, err := db.GetTestCaseFromDB(id)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "test_case_not_found", "Test case not found", map[string]interface{}{
				"id": id,
			})
		} else {
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusOK, testCase)
}

func GetAllTestCases(w http.ResponseWriter, r *http.Request) {
	q, ok := parseListQuery(w, r, []string{"id"})
	if !ok {
		return
	}

	filter := db.TestCaseFilter{Search: r.URL.Query().Get("q")}
	testCases, total, err := db.GetTestCases(db.ListOptions{
		Limit:  q.Limit,
		Offset: q.Offset,
		SortBy: q.SortBy,
		Order:  q.Order,
	}, filter)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writePaginationHeaders(w, total, q.Limit, q.Offset)
	writeJSON(w, http.StatusOK, testCases)
}

func UpdateTestCaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeMethodNotAllowed(w, r.Method, r.URL.Path)
		return
	}

	caseIDStr := mux.Vars(r)["id"]
	if caseIDStr == "" {
		writeMissingPathParam(w, "case ID")
		return
	}

	caseID, err := strconv.Atoi(caseIDStr)
	if err != nil {
		writeInvalidPathParam(w, "case ID", caseIDStr)
		return
	}

	var updatedTest db.TestCase
	err = json.NewDecoder(r.Body).Decode(&updatedTest)
	if err != nil {
		writeInvalidJSON(w, err)
		return
	}

	err = db.UpdateTestCaseInDB(int64(caseID), updatedTest.Test)
	if err != nil {
		if errors.Is(err, db.ErrTestCaseNotFound) {
			writeNotFound(w, "test_case_not_found", "Test case not found", map[string]interface{}{"id": caseID})
			return
		}
		writeInternalError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
func DeleteTestCaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeMethodNotAllowed(w, r.Method, r.URL.Path)
		return
	}

	caseIDStr := mux.Vars(r)["id"]
	if caseIDStr == "" {
		writeMissingPathParam(w, "case ID")
		return
	}

	caseID, err := strconv.Atoi(caseIDStr)
	if err != nil {
		writeInvalidPathParam(w, "case ID", caseIDStr)
		return
	}

	err = db.DeleteTestCaseInDB(int64(caseID))
	if err != nil {
		switch {
		case errors.Is(err, db.ErrTestCaseNotFound):
			writeNotFound(w, "test_case_not_found", "Test case not found", map[string]interface{}{"id": caseID})
		case errors.Is(err, db.ErrConflict):
			writeConflict(w, "test_case_in_use", "Test case is referenced by one or more test runs and cannot be deleted", map[string]interface{}{"id": caseID})
		default:
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Test case was deleted"})
}
