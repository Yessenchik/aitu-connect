//internal/handlers/auth_handler.go
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"aitu-connect/internal/services"
)

type AuthHandler struct {
	auth *services.AuthService
}

func NewAuthHandler(auth *services.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

type signUpReq struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Bio       string `json:"bio"` // optional
}

type signInReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	var req signUpReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}

	_, err := h.auth.SignUp(
		r.Context(),
		req.Email,
		req.Password,
		req.Role,
		req.FirstName,
		req.LastName,
		req.Bio,
	)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 201, map[string]string{"status": "ok"})
}

func (h *AuthHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	var req signInReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}

	sessionID, err := h.auth.SignIn(r.Context(), req.Email, req.Password)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": err.Error()})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "sid",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // set true when using HTTPS
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("sid")
	if err == nil && c.Value != "" {
		_ = h.auth.Logout(r.Context(), c.Value)
	}

	// clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "sid",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, 200, map[string]string{"status": "ok"})
}
