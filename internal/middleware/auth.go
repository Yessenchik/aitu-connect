// internal/middleware/auth.go (updated: added contextKey, userIDKey, and GetUserIDFromContext)
package middleware

import (
	"context"
	"net/http"
	"strconv"

	"4/internal/storage"
)

type contextKey string

const userIDKey contextKey = "userID"

// AuthMiddleware checks session cookie and sets user ID in context
func AuthMiddleware(store *storage.InMemStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session")
			if err != nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			userID, err := strconv.Atoi(cookie.Value)
			if err != nil {
				http.Error(w, "Invalid session", http.StatusUnauthorized)
				return
			}

			// Verify user exists
			_, exists := store.GetUserByID(userID)
			if !exists {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Set user ID in context
			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserIDFromContext retrieves the user ID from the request context
func GetUserIDFromContext(r *http.Request) int {
	userID, _ := r.Context().Value(userIDKey).(int)
	return userID
}
