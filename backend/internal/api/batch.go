package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"testBarn/db"

	"github.com/gorilla/mux"
)

// batchItemResult is the per-item outcome of a batch operation (partial-success report).
type batchItemResult struct {
	ID     int           `json:"id"`
	Status string        `json:"status"` // "ok" | "error"
	Error  *batchItemErr `json:"error,omitempty"`
}

type batchItemErr struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type batchSummary struct {
	Total     int `json:"total"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
}

type batchResponse struct {
	Results []batchItemResult `json:"results"`
	Summary batchSummary      `json:"summary"`
}

func ok(id int) batchItemResult {
	return batchItemResult{ID: id, Status: "ok"}
}

func fail(id int, code, message string) batchItemResult {
	return batchItemResult{ID: id, Status: "error", Error: &batchItemErr{Code: code, Message: message}}
}

func writeBatchResponse(w http.ResponseWriter, results []batchItemResult) {
	summary := batchSummary{Total: len(results)}
	for _, res := range results {
		if res.Status == "ok" {
			summary.Succeeded++
		} else {
			summary.Failed++
		}
	}
	writeJSON(w, http.StatusOK, batchResponse{Results: results, Summary: summary})
}

// BatchDeleteTestCasesHandler handles DELETE /testcases:batch.
// Body: {"ids": [1, 2, 3]}. Each id is processed independently; successes persist.
func BatchDeleteTestCasesHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeInvalidJSON(w, err)
		return
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "ids must not be empty", map[string]interface{}{"field": "ids"})
		return
	}

	results := make([]batchItemResult, 0, len(req.IDs))
	for _, id := range req.IDs {
		if id <= 0 {
			results = append(results, fail(id, "invalid_id", "id must be a positive integer"))
			continue
		}
		err := db.DeleteTestCaseInDB(int64(id))
		switch {
		case err == nil:
			results = append(results, ok(id))
		case errors.Is(err, db.ErrTestCaseNotFound):
			results = append(results, fail(id, "test_case_not_found", "Test case not found"))
		case errors.Is(err, db.ErrConflict):
			results = append(results, fail(id, "test_case_in_use", "Test case is referenced by one or more test runs"))
		default:
			results = append(results, fail(id, "internal_error", "Internal server error"))
		}
	}

	writeBatchResponse(w, results)
}

// BatchAddCasesToSuiteHandler handles POST /test-suites/{id}/cases:batch.
// Body: {"case_ids": [1, 2, 3]}. Idempotent per case; partial-success report.
func BatchAddCasesToSuiteHandler(w http.ResponseWriter, r *http.Request) {
	suiteIDStr := mux.Vars(r)["id"]
	suiteID, err := strconv.Atoi(suiteIDStr)
	if err != nil || suiteID <= 0 {
		writeInvalidPathParam(w, "suite ID", suiteIDStr)
		return
	}

	var req struct {
		CaseIDs []int `json:"case_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeInvalidJSON(w, err)
		return
	}
	if len(req.CaseIDs) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "case_ids must not be empty", map[string]interface{}{"field": "case_ids"})
		return
	}

	exists, err := db.SuiteExists(suiteID)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if !exists {
		writeNotFound(w, "test_suite_not_found", "Test suite not found", map[string]interface{}{"id": suiteID})
		return
	}

	results := make([]batchItemResult, 0, len(req.CaseIDs))
	for _, caseID := range req.CaseIDs {
		if caseID <= 0 {
			results = append(results, fail(caseID, "invalid_id", "case_id must be a positive integer"))
			continue
		}
		err := db.LinkTestCaseToSuite(suiteID, caseID)
		switch {
		case err == nil:
			results = append(results, ok(caseID))
		case errors.Is(err, db.ErrTestCaseNotFound):
			results = append(results, fail(caseID, "test_case_not_found", "Test case not found"))
		default:
			results = append(results, fail(caseID, "internal_error", "Internal server error"))
		}
	}

	writeBatchResponse(w, results)
}

// BatchUpdateRunCaseStatusHandler handles PATCH /test-runs/{runId}/cases:batch.
// Body: {"executed_by": "qa", "items": [{"case_id": 1, "status": "passed", "comment": "..."}]}.
func BatchUpdateRunCaseStatusHandler(w http.ResponseWriter, r *http.Request) {
	runIDStr := mux.Vars(r)["runId"]
	runID, err := strconv.Atoi(runIDStr)
	if err != nil || runID <= 0 {
		writeInvalidPathParam(w, "run ID", runIDStr)
		return
	}

	var req struct {
		ExecutedBy *string `json:"executed_by,omitempty"`
		Items      []struct {
			CaseID     int     `json:"case_id"`
			Status     string  `json:"status"`
			Comment    *string `json:"comment,omitempty"`
			ExecutedBy *string `json:"executed_by,omitempty"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeInvalidJSON(w, err)
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "items must not be empty", map[string]interface{}{"field": "items"})
		return
	}

	// Fail fast if the run itself does not exist.
	if _, err := db.GetTestRunByID(runID); err != nil {
		if errors.Is(err, db.ErrTestRunNotFound) {
			writeNotFound(w, "test_run_not_found", "Test run not found", map[string]interface{}{"id": runID})
			return
		}
		writeInternalError(w, err)
		return
	}

	results := make([]batchItemResult, 0, len(req.Items))
	for _, item := range req.Items {
		if item.CaseID <= 0 {
			results = append(results, fail(item.CaseID, "invalid_id", "case_id must be a positive integer"))
			continue
		}
		if _, valid := db.AllowedRunCaseStatuses[item.Status]; !valid {
			results = append(results, fail(item.CaseID, "invalid_status", "Invalid status: "+item.Status))
			continue
		}
		executedBy := item.ExecutedBy
		if executedBy == nil {
			executedBy = req.ExecutedBy
		}
		err := db.UpdateRunCaseStatus(runID, item.CaseID, item.Status, item.Comment, executedBy)
		switch {
		case err == nil:
			results = append(results, ok(item.CaseID))
		case errors.Is(err, db.ErrTestRunCaseNotFound):
			results = append(results, fail(item.CaseID, "test_run_case_not_found", "Test case not found in this run"))
		default:
			results = append(results, fail(item.CaseID, "internal_error", "Internal server error"))
		}
	}

	writeBatchResponse(w, results)
}
