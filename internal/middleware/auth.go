package middleware

import (
	"context"
	"net/http"
	"time"

	"aitu-connect/internal/repo"
)

type ctxKey string

const userIDKey ctxKey = "userID"

func UserIDFromContext(ctx context.Context) (string, bool) {
	v := ctx.Value(userIDKey)
	id, ok := v.(string)
	return id, ok
}

func RequireAuth(sessions *repo.SessionRepo, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("sid")
		if err != nil || c.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userID, expiresAt, err := sessions.GetUserIDBySession(r.Context(), c.Value)
		if err != nil || time.Now().After(expiresAt) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
