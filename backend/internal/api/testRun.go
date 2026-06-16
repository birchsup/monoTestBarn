package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"testBarn/db"
	"time"

	"github.com/gorilla/mux"
)

type CreateTestRunRequest struct {
	SuiteID    *int            `json:"suite_id,omitempty"`
	RunDetails json.RawMessage `json:"run_details"`
	CaseIDs    []int           `json:"test_case_ids"`
	ExecutedBy *string         `json:"executed_by,omitempty"`
}

type UpdateRunCaseStatusRequest struct {
	Status     string  `json:"status"`
	Comment    *string `json:"comment,omitempty"`
	ExecutedBy *string `json:"executed_by,omitempty"`
}

func CreateTestRunHandler(w http.ResponseWriter, r *http.Request) {
	var createReq CreateTestRunRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		writeInvalidJSON(w, err)
		return
	}

	for _, id := range createReq.CaseIDs {
		if id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid_request", "Invalid test_case_id", map[string]interface{}{
				"field": "test_case_ids",
				"value": id,
			})
			return
		}
	}
	if createReq.SuiteID != nil && *createReq.SuiteID <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid suite_id", map[string]interface{}{
			"field": "suite_id",
			"value": *createReq.SuiteID,
		})
		return
	}

	run, err := db.CreateTestRun(db.CreateTestRunParams{
		SuiteID:    createReq.SuiteID,
		CaseIDs:    createReq.CaseIDs,
		RunDetails: createReq.RunDetails,
		ExecutedBy: createReq.ExecutedBy,
	})
	if err != nil {
		switch {
		case errors.Is(err, db.ErrTestSuiteNotFound), errors.Is(err, db.ErrTestCaseNotFound):
			code := "resource_not_found"
			switch {
			case errors.Is(err, db.ErrTestSuiteNotFound):
				code = "test_suite_not_found"
			case errors.Is(err, db.ErrTestCaseNotFound):
				code = "test_case_not_found"
			}
			writeError(w, http.StatusNotFound, code, err.Error(), nil)
		case strings.Contains(err.Error(), "at least one source"), strings.Contains(err.Error(), "resolved test case set is empty"):
			writeError(w, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		default:
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusCreated, run)
}

func GetAllTestRunsHandler(w http.ResponseWriter, r *http.Request) {
	q, ok := parseListQuery(w, r, []string{"created_at", "id"})
	if !ok {
		return
	}

	query := r.URL.Query()
	var filter db.TestRunFilter

	if raw := strings.TrimSpace(query.Get("suite_id")); raw != "" {
		suiteID, err := strconv.Atoi(raw)
		if err != nil || suiteID <= 0 {
			writeInvalidQueryParam(w, "suite_id", raw)
			return
		}
		filter.SuiteID = &suiteID
	}

	if raw := strings.TrimSpace(query.Get("date_from")); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			writeInvalidQueryParam(w, "date_from", raw)
			return
		}
		filter.DateFrom = &t
	}

	if raw := strings.TrimSpace(query.Get("date_to")); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			writeInvalidQueryParam(w, "date_to", raw)
			return
		}
		filter.DateTo = &t
	}

	runs, total, err := db.GetTestRuns(db.ListOptions{
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
	writeJSON(w, http.StatusOK, runs)
}

func GetTestRunByIDHandler(w http.ResponseWriter, r *http.Request) {
	runIDStr := mux.Vars(r)["id"]
	if runIDStr == "" {
		writeMissingPathParam(w, "run ID")
		return
	}

	runID, err := strconv.Atoi(runIDStr)
	if err != nil || runID <= 0 {
		writeInvalidPathParam(w, "run ID", runIDStr)
		return
	}

	run, err := db.GetTestRunByID(runID)
	if err != nil {
		if errors.Is(err, db.ErrTestRunNotFound) {
			writeError(w, http.StatusNotFound, "test_run_not_found", err.Error(), map[string]interface{}{
				"id": runID,
			})
		} else {
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusOK, run)
}

func GetTestRunCaseHandler(w http.ResponseWriter, r *http.Request) {
	runIDStr := mux.Vars(r)["runId"]
	caseIDStr := mux.Vars(r)["caseId"]
	if runIDStr == "" || caseIDStr == "" {
		writeError(w, http.StatusBadRequest, "missing_path_param", "Missing runId or caseId", map[string]interface{}{
			"runId":  runIDStr,
			"caseId": caseIDStr,
		})
		return
	}

	runID, err := strconv.Atoi(runIDStr)
	if err != nil || runID <= 0 {
		writeInvalidPathParam(w, "run ID", runIDStr)
		return
	}

	caseID, err := strconv.Atoi(caseIDStr)
	if err != nil || caseID <= 0 {
		writeInvalidPathParam(w, "case ID", caseIDStr)
		return
	}

	details, err := db.GetTestRunCaseByID(runID, caseID)
	if err != nil {
		switch {
		case errors.Is(err, db.ErrTestRunNotFound):
			writeError(w, http.StatusNotFound, "test_run_not_found", err.Error(), map[string]interface{}{
				"run_id": runID,
			})
		case errors.Is(err, db.ErrTestRunCaseNotFound):
			writeError(w, http.StatusNotFound, "test_run_case_not_found", err.Error(), map[string]interface{}{
				"run_id":  runID,
				"case_id": caseID,
			})
		default:
			writeInternalError(w, err)
		}
		return
	}

	writeJSON(w, http.StatusOK, details)
}

func UpdateTestRunCaseStatusHandler(w http.ResponseWriter, r *http.Request) {
	runIDStr := mux.Vars(r)["runId"]
	caseIDStr := mux.Vars(r)["caseId"]
	if runIDStr == "" || caseIDStr == "" {
		writeError(w, http.StatusBadRequest, "missing_path_param", "Missing runId or caseId", map[string]interface{}{
			"runId":  runIDStr,
			"caseId": caseIDStr,
		})
		return
	}

	runID, err := strconv.Atoi(runIDStr)
	if err != nil || runID <= 0 {
		writeInvalidPathParam(w, "run ID", runIDStr)
		return
	}

	caseID, err := strconv.Atoi(caseIDStr)
	if err != nil || caseID <= 0 {
		writeInvalidPathParam(w, "case ID", caseIDStr)
		return
	}

	var updateReq UpdateRunCaseStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		writeInvalidJSON(w, err)
		return
	}
	if _, ok := db.AllowedRunCaseStatuses[updateReq.Status]; !ok {
		writeError(w, http.StatusBadRequest, "invalid_status", "Invalid status", map[string]interface{}{
			"field": "status",
			"value": updateReq.Status,
		})
		return
	}

	if err := db.UpdateRunCaseStatus(runID, caseID, updateReq.Status, updateReq.Comment, updateReq.ExecutedBy); err != nil {
		switch {
		case errors.Is(err, db.ErrTestRunNotFound), errors.Is(err, db.ErrTestRunCaseNotFound):
			code := "resource_not_found"
			switch {
			case errors.Is(err, db.ErrTestRunNotFound):
				code = "test_run_not_found"
			case errors.Is(err, db.ErrTestRunCaseNotFound):
				code = "test_run_case_not_found"
			}
			writeError(w, http.StatusNotFound, code, err.Error(), nil)
		case strings.Contains(err.Error(), "invalid status"):
			writeError(w, http.StatusBadRequest, "invalid_status", err.Error(), nil)
		default:
			writeInternalError(w, err)
		}
		return
	}

	updatedRun, err := db.GetTestRunByID(runID)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, updatedRun)
}
