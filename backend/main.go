package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"testBarn/config"
	"testBarn/db"
	"testBarn/internal/api"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// allowedOrigins reads CORS_ALLOWED_ORIGINS (comma-separated) and falls back to "*".
func allowedOrigins() []string {
	if raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS")); raw != "" {
		parts := strings.Split(raw, ",")
		origins := make([]string, 0, len(parts))
		for _, p := range parts {
			if p = strings.TrimSpace(p); p != "" {
				origins = append(origins, p)
			}
		}
		if len(origins) > 0 {
			return origins
		}
	}
	return []string{"*"}
}

func main() {
	config.InitConfig()
	db.InitDB()
	defer db.DBPool.Close()

	r := mux.NewRouter()
	//testCases
	r.HandleFunc("/testcases", api.CreateTestCase).Methods("POST")
	r.HandleFunc("/testcases/{id}", api.GetTestCaseHandler).Methods("GET")
	r.HandleFunc("/testcases", api.GetAllTestCases).Methods("GET")
	r.HandleFunc("/testcases:batch", api.BatchDeleteTestCasesHandler).Methods("DELETE")
	r.HandleFunc("/testcases/{id}", api.UpdateTestCaseHandler).Methods("PUT")
	r.HandleFunc("/testcases/{id}", api.DeleteTestCaseHandler).Methods("DELETE")

	//test Runs
	r.HandleFunc("/test-runs", api.CreateTestRunHandler).Methods("POST")
	r.HandleFunc("/test-runs", api.GetAllTestRunsHandler).Methods("GET")
	r.HandleFunc("/test-runs/{id}", api.GetTestRunByIDHandler).Methods("GET")
	r.HandleFunc("/test-runs/{runId}/cases:batch", api.BatchUpdateRunCaseStatusHandler).Methods("PATCH")
	r.HandleFunc("/test-runs/{runId}/cases/{caseId}", api.UpdateTestRunCaseStatusHandler).Methods("PATCH")

	//test suites
	r.HandleFunc("/test-suites", api.GetAllTestSuitesHandler).Methods("GET")
	r.HandleFunc("/test-suites", api.CreateTestSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}", api.GetTestSuiteByIDHandler).Methods("GET")
	r.HandleFunc("/test-suites/{id}", api.UpdateTestSuiteHandler).Methods("PUT")
	r.HandleFunc("/test-suites/{id}", api.DeleteTestSuiteHandler).Methods("DELETE")
	r.HandleFunc("/test-suites/{id}/cases:batch", api.BatchAddCasesToSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}/cases", api.AddTestCasesToSuiteHandler).Methods("POST")
	r.HandleFunc("/test-suites/{id}/cases/{caseId}", api.RemoveTestCaseFromSuiteHandler).Methods("DELETE")
	api.ConfigureRouter(r)

	// CORS
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins(allowedOrigins()),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
		// AllowedHeaders appends values. Keep a single explicit list to avoid accidental invalid header names.
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "Ngrok-Skip-Browser-Warning"}),
		// Pagination metadata must be explicitly exposed for browser clients.
		handlers.ExposedHeaders([]string{"X-Total-Count", "X-Limit", "X-Offset"}),
	)(r)

	log.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", corsHandler))
}
