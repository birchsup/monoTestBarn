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

func CreateTestSuiteHandler(w http.ResponseWriter, r *http.Request) {
	var request db.TestSuiteRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeInvalidJSON(w, err)
		return
	}

	testSuite, err := db.CreateTestSuite(request.Name, request.Description)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, testSuite)
}

func AddTestCasesToSuiteHandler(w http.ResponseWriter, r *http.Request) {
	var request db.AddTestCaseRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeInvalidJSON(w, err)
		return
	}

	suiteIDStr := mux.Vars(r)["id"]
	if suiteIDStr == "" {
		writeMissingPathParam(w, "suite ID")
		return
	}

	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	request.SuiteID = suiteID
	err = db.AddTestCasesToSuite(request.SuiteID, request.CaseIDs)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetTestSuiteByIDHandler(w http.ResponseWriter, r *http.Request) {
	suiteIDStr := mux.Vars(r)["id"]
	if suiteIDStr == "" {
		writeMissingPathParam(w, "suite ID")
		return
	}

	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	testSuite, err := db.GetTestSuiteByID(suiteID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "test_suite_not_found", "Test suite not found", map[string]interface{}{
				"id": suiteID,
			})
		} else {
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusOK, testSuite)
}
func UpdateTestSuiteHandler(w http.ResponseWriter, r *http.Request) {
	var request db.TestSuiteRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeInvalidJSON(w, err)
		return
	}

	suiteIDStr := mux.Vars(r)["id"]
	if suiteIDStr == "" {
		writeMissingPathParam(w, "suite ID")
		return
	}

	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	testSuite, err := db.UpdateTestSuite(suiteID, request.Name, request.Description)
	if err != nil {
		if errors.Is(err, db.ErrTestSuiteNotFound) {
			writeNotFound(w, "test_suite_not_found", "Test suite not found", map[string]interface{}{"id": suiteID})
			return
		}
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, testSuite)
}

func DeleteTestSuiteHandler(w http.ResponseWriter, r *http.Request) {
	suiteIDStr := mux.Vars(r)["id"]
	if suiteIDStr == "" {
		writeMissingPathParam(w, "suite ID")
		return
	}

	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	err = db.DeleteTestSuite(suiteID)
	if err != nil {
		switch {
		case errors.Is(err, db.ErrTestSuiteNotFound):
			writeNotFound(w, "test_suite_not_found", "Test suite not found", map[string]interface{}{"id": suiteID})
		case errors.Is(err, db.ErrConflict):
			writeConflict(w, "test_suite_in_use", "Test suite cannot be deleted due to existing references", map[string]interface{}{"id": suiteID})
		default:
			writeInternalError(w, err)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func RemoveTestCaseFromSuiteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeMethodNotAllowed(w, r.Method, r.URL.Path)
		return
	}

	suiteIDStr := mux.Vars(r)["id"]
	if suiteIDStr == "" {
		writeMissingPathParam(w, "suite ID")
		return
	}

	caseIDStr := mux.Vars(r)["caseId"]
	if caseIDStr == "" {
		writeMissingPathParam(w, "case ID")
		return
	}

	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	caseID, err := strconv.Atoi(caseIDStr)
	if err != nil || caseID <= 0 {
		writeInvalidPathParam(w, "case ID", caseIDStr)
		return
	}

	err = db.RemoveTestCaseFromSuite(suiteID, caseID)
	if err != nil {
		if errors.Is(err, db.ErrSuiteCaseLinkNotFound) {
			writeNotFound(w, "suite_case_link_not_found", "Test case is not linked to this suite", map[string]interface{}{
				"suite_id": suiteID,
				"case_id":  caseID,
			})
			return
		}
		writeInternalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func GetAllTestSuitesHandler(w http.ResponseWriter, r *http.Request) {
	q, ok := parseListQuery(w, r, []string{"created_at", "name", "id"})
	if !ok {
		return
	}

	filter := db.TestSuiteFilter{Name: r.URL.Query().Get("name")}
	testSuites, total, err := db.GetTestSuites(db.ListOptions{
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
	writeJSON(w, http.StatusOK, testSuites)
}
