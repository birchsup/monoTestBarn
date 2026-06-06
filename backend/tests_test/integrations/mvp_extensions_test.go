package integrations_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testBarn/internal/api"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newFullRouter mirrors the route table from main.go so integration tests
// exercise the same contract the binary serves.
func newFullRouter() *mux.Router {
	r := mux.NewRouter()

	r.HandleFunc("/testcases", api.CreateTestCase).Methods("POST")
	r.HandleFunc("/testcases/{id}", api.GetTestCaseHandler).Methods("GET")
	r.HandleFunc("/testcases", api.GetAllTestCases).Methods("GET")
	r.HandleFunc("/testcases:batch", api.BatchDeleteTestCasesHandler).Methods("DELETE")
	r.HandleFunc("/testcases/{id}", api.UpdateTestCaseHandler).Methods("PUT")
	r.HandleFunc("/testcases/{id}", api.DeleteTestCaseHandler).Methods("DELETE")

	r.HandleFunc("/test-runs", api.CreateTestRunHandler).Methods("POST")
	r.HandleFunc("/test-runs", api.GetAllTestRunsHandler).Methods("GET")
	r.HandleFunc("/test-runs/{id}", api.GetTestRunByIDHandler).Methods("GET")
	r.HandleFunc("/test-runs/{runId}/cases:batch", api.BatchUpdateRunCaseStatusHandler).Methods("PATCH")
	r.HandleFunc("/test-runs/{runId}/cases/{caseId}", api.UpdateTestRunCaseStatusHandler).Methods("PATCH")

	r.HandleFunc("/test-suites", api.GetAllTestSuitesHandler).Methods("GET")
	r.HandleFunc("/test-suites", api.CreateTestSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}", api.GetTestSuiteByIDHandler).Methods("GET")
	r.HandleFunc("/test-suites/{id}", api.UpdateTestSuiteHandler).Methods("PUT")
	r.HandleFunc("/test-suites/{id}", api.DeleteTestSuiteHandler).Methods("DELETE")
	r.HandleFunc("/test-suites/{id}/cases:batch", api.BatchAddCasesToSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}/cases", api.AddTestCasesToSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}/cases/{caseId}", api.RemoveTestCaseFromSuiteHandler).Methods("DELETE")

	api.ConfigureRouter(r)
	return r
}

func createTestCaseHTTP(t *testing.T, baseURL, name string) int64 {
	t.Helper()
	body, _ := json.Marshal(map[string]interface{}{"test": map[string]interface{}{"name": name}})
	resp, err := http.Post(baseURL+"/testcases", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var created struct {
		ID int64 `json:"id"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	require.NotZero(t, created.ID)
	return created.ID
}

func createSuiteHTTP(t *testing.T, baseURL, name string) int {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"name": name, "description": "d"})
	resp, err := http.Post(baseURL+"/test-suites", "application/json", bytes.NewBuffer(body))
	require.NoError(t, err)
	defer func() { _ = resp.Body.Close() }()
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	var created struct {
		ID int `json:"id"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	return created.ID
}

func doRequest(t *testing.T, method, url string, payload interface{}) *http.Response {
	t.Helper()
	var buf *bytes.Buffer
	if payload != nil {
		b, _ := json.Marshal(payload)
		buf = bytes.NewBuffer(b)
	} else {
		buf = bytes.NewBuffer(nil)
	}
	req, err := http.NewRequest(method, url, buf)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// Backend #5: RowsAffected -> 404 for update/delete on non-existing resources.
func TestRowsAffectedNotFound(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	t.Run("update non-existing test case", func(t *testing.T) {
		resp := doRequest(t, http.MethodPut, server.URL+"/testcases/99999999", map[string]interface{}{"test": map[string]interface{}{"name": "x"}})
		defer func() { _ = resp.Body.Close() }()
		assertJSONErrorResponse(t, resp, http.StatusNotFound, "test_case_not_found", "Test case not found")
	})

	t.Run("delete non-existing test case", func(t *testing.T) {
		resp := doRequest(t, http.MethodDelete, server.URL+"/testcases/99999999", nil)
		defer func() { _ = resp.Body.Close() }()
		assertJSONErrorResponse(t, resp, http.StatusNotFound, "test_case_not_found", "Test case not found")
	})

	t.Run("update non-existing suite", func(t *testing.T) {
		resp := doRequest(t, http.MethodPut, server.URL+"/test-suites/99999999", map[string]string{"name": "n", "description": "d"})
		defer func() { _ = resp.Body.Close() }()
		assertJSONErrorResponse(t, resp, http.StatusNotFound, "test_suite_not_found", "Test suite not found")
	})

	t.Run("delete non-existing suite", func(t *testing.T) {
		resp := doRequest(t, http.MethodDelete, server.URL+"/test-suites/99999999", nil)
		defer func() { _ = resp.Body.Close() }()
		assertJSONErrorResponse(t, resp, http.StatusNotFound, "test_suite_not_found", "Test suite not found")
	})

	t.Run("remove non-existing suite-case link", func(t *testing.T) {
		suiteID := createSuiteHTTP(t, server.URL, "link-suite")
		resp := doRequest(t, http.MethodDelete, fmt.Sprintf("%s/test-suites/%d/cases/99999999", server.URL, suiteID), nil)
		defer func() { _ = resp.Body.Close() }()
		assertJSONErrorResponse(t, resp, http.StatusNotFound, "suite_case_link_not_found", "Test case is not linked to this suite")
	})
}

// Backend #6: deleting a test case that is referenced by a run -> 409 (RESTRICT).
func TestForeignKeyConflictOnDelete(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	caseID := createTestCaseHTTP(t, server.URL, "fk-case")

	runResp := doRequest(t, http.MethodPost, server.URL+"/test-runs", map[string]interface{}{
		"test_case_ids": []int64{caseID},
	})
	defer func() { _ = runResp.Body.Close() }()
	require.Equal(t, http.StatusCreated, runResp.StatusCode)

	delResp := doRequest(t, http.MethodDelete, fmt.Sprintf("%s/testcases/%d", server.URL, caseID), nil)
	defer func() { _ = delResp.Body.Close() }()
	assertJSONErrorResponse(t, delResp, http.StatusConflict, "test_case_in_use", "Test case is referenced by one or more test runs and cannot be deleted")
}

// Backend #6: deleting a suite with linked cases cascades the links and keeps run history.
func TestDeleteSuiteCascadesLinks(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	caseID := createTestCaseHTTP(t, server.URL, "cascade-case")
	suiteID := createSuiteHTTP(t, server.URL, "cascade-suite")

	addResp := doRequest(t, http.MethodPost, fmt.Sprintf("%s/test-suites/%d/cases", server.URL, suiteID), map[string]interface{}{
		"case_ids": []int64{caseID},
	})
	_ = addResp.Body.Close()
	require.Equal(t, http.StatusOK, addResp.StatusCode)

	delResp := doRequest(t, http.MethodDelete, fmt.Sprintf("%s/test-suites/%d", server.URL, suiteID), nil)
	defer func() { _ = delResp.Body.Close() }()
	assert.Equal(t, http.StatusNoContent, delResp.StatusCode)
}

// Backend #7: pagination/sort headers and limit/offset behaviour.
func TestListPaginationAndSort(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	for i := 0; i < 3; i++ {
		createSuiteHTTP(t, server.URL, fmt.Sprintf("page-suite-%d", i))
	}

	resp := doRequest(t, http.MethodGet, server.URL+"/test-suites?limit=2&offset=0&sort_by=id&order=asc", nil)
	defer func() { _ = resp.Body.Close() }()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	total, err := strconv.Atoi(resp.Header.Get("X-Total-Count"))
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, 3)
	assert.Equal(t, "2", resp.Header.Get("X-Limit"))
	assert.Equal(t, "0", resp.Header.Get("X-Offset"))

	var suites []map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&suites))
	assert.Len(t, suites, 2, "limit=2 should cap returned rows")

	t.Run("invalid sort_by", func(t *testing.T) {
		bad := doRequest(t, http.MethodGet, server.URL+"/test-suites?sort_by=drop_table", nil)
		defer func() { _ = bad.Body.Close() }()
		assertJSONErrorResponse(t, bad, http.StatusBadRequest, "invalid_query_param", "Invalid sort_by")
	})

	t.Run("invalid limit", func(t *testing.T) {
		bad := doRequest(t, http.MethodGet, server.URL+"/test-suites?limit=-1", nil)
		defer func() { _ = bad.Body.Close() }()
		assertJSONErrorResponse(t, bad, http.StatusBadRequest, "invalid_query_param", "Invalid limit")
	})
}

// Backend #8: batch delete of test cases reports per-item partial success.
func TestBatchDeleteTestCases(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	good := createTestCaseHTTP(t, server.URL, "batch-del-ok")

	resp := doRequest(t, http.MethodDelete, server.URL+"/testcases:batch", map[string]interface{}{
		"ids": []int64{good, 99999999},
	})
	defer func() { _ = resp.Body.Close() }()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var report struct {
		Results []struct {
			ID     int    `json:"id"`
			Status string `json:"status"`
			Error  *struct {
				Code string `json:"code"`
			} `json:"error,omitempty"`
		} `json:"results"`
		Summary struct {
			Total     int `json:"total"`
			Succeeded int `json:"succeeded"`
			Failed    int `json:"failed"`
		} `json:"summary"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&report))
	assert.Equal(t, 2, report.Summary.Total)
	assert.Equal(t, 1, report.Summary.Succeeded)
	assert.Equal(t, 1, report.Summary.Failed)
}

// Backend #8: batch add cases to a suite reports per-item partial success.
func TestBatchAddCasesToSuite(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	suiteID := createSuiteHTTP(t, server.URL, "batch-add-suite")
	caseID := createTestCaseHTTP(t, server.URL, "batch-add-ok")

	resp := doRequest(t, http.MethodPost, fmt.Sprintf("%s/test-suites/%d/cases:batch", server.URL, suiteID), map[string]interface{}{
		"case_ids": []int64{caseID, 99999999},
	})
	defer func() { _ = resp.Body.Close() }()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var report struct {
		Summary struct {
			Succeeded int `json:"succeeded"`
			Failed    int `json:"failed"`
		} `json:"summary"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&report))
	assert.Equal(t, 1, report.Summary.Succeeded)
	assert.Equal(t, 1, report.Summary.Failed)
}

// Backend #8: batch run-case status update reports per-item partial success.
func TestBatchUpdateRunCaseStatus(t *testing.T) {
	server := httptest.NewServer(newFullRouter())
	defer server.Close()

	caseID := createTestCaseHTTP(t, server.URL, "batch-run-case")

	runResp := doRequest(t, http.MethodPost, server.URL+"/test-runs", map[string]interface{}{
		"test_case_ids": []int64{caseID},
	})
	require.Equal(t, http.StatusCreated, runResp.StatusCode)
	var run struct {
		ID int `json:"id"`
	}
	require.NoError(t, json.NewDecoder(runResp.Body).Decode(&run))
	_ = runResp.Body.Close()

	resp := doRequest(t, http.MethodPatch, fmt.Sprintf("%s/test-runs/%d/cases:batch", server.URL, run.ID), map[string]interface{}{
		"executed_by": "qa.batch",
		"items": []map[string]interface{}{
			{"case_id": caseID, "status": "passed", "comment": "ok"},
			{"case_id": 99999999, "status": "failed"},
		},
	})
	defer func() { _ = resp.Body.Close() }()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var report struct {
		Summary struct {
			Succeeded int `json:"succeeded"`
			Failed    int `json:"failed"`
		} `json:"summary"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&report))
	assert.Equal(t, 1, report.Summary.Succeeded)
	assert.Equal(t, 1, report.Summary.Failed)

	getRun := doRequest(t, http.MethodGet, fmt.Sprintf("%s/test-runs/%d", server.URL, run.ID), nil)
	defer func() { _ = getRun.Body.Close() }()
	var details struct {
		Summary struct {
			Passed int `json:"passed"`
		} `json:"summary"`
	}
	require.NoError(t, json.NewDecoder(getRun.Body).Decode(&details))
	assert.Equal(t, 1, details.Summary.Passed)
}
