package handlers

import (
	"encoding/json"
	"net/http"

	"aitu-connect/internal/middleware"
	"aitu-connect/internal/repo"
)

type ProfileHandler struct {
	users *repo.UserRepo
}

func NewProfileHandler(users *repo.UserRepo) *ProfileHandler {
	return &ProfileHandler{users: users}
}

func (h *ProfileHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Do NOT send password hash
	user.PasswordHash = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
