package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

type ErrorResponse struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details"`
}

func ConfigureRouter(r *mux.Router) {
	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		writeError(w, http.StatusNotFound, "route_not_found", "Route not found", map[string]interface{}{
			"method": req.Method,
			"path":   req.URL.Path,
		})
	})

	r.MethodNotAllowedHandler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed", map[string]interface{}{
			"method": req.Method,
			"path":   req.URL.Path,
		})
	})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("ngrok-skip-browser-warning", "true")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func writeError(w http.ResponseWriter, status int, code string, message string, details interface{}) {
	writeJSON(w, status, ErrorResponse{
		Code:    code,
		Message: message,
		Details: details,
	})
}

func writeInvalidJSON(w http.ResponseWriter, err error) {
	writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON", map[string]interface{}{
		"error": err.Error(),
	})
}

func writeMissingPathParam(w http.ResponseWriter, param string) {
	writeError(w, http.StatusBadRequest, "missing_path_param", fmt.Sprintf("Missing %s", param), map[string]interface{}{
		"param": param,
	})
}

func writeInvalidPathParam(w http.ResponseWriter, param string, value string) {
	writeError(w, http.StatusBadRequest, "invalid_path_param", fmt.Sprintf("Invalid %s", param), map[string]interface{}{
		"param": param,
		"value": value,
	})
}

func writeMethodNotAllowed(w http.ResponseWriter, method string, path string) {
	writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Method not allowed", map[string]interface{}{
		"method": method,
		"path":   path,
	})
}

func writeNotFound(w http.ResponseWriter, code string, message string, details interface{}) {
	writeError(w, http.StatusNotFound, code, message, details)
}

func writeConflict(w http.ResponseWriter, code string, message string, details interface{}) {
	writeError(w, http.StatusConflict, code, message, details)
}

func writeInternalError(w http.ResponseWriter, err error) {
	_ = err
	writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error", nil)
}
