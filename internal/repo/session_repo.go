package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepo struct {
	db *pgxpool.Pool
}

func NewSessionRepo(db *pgxpool.Pool) *SessionRepo {
	return &SessionRepo{db: db}
}

func (r *SessionRepo) Create(ctx context.Context, userID string, expiresAt time.Time) (string, error) {
	var sessionID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO sessions (user_id, expires_at)
		VALUES ($1, $2)
		RETURNING id
	`, userID, expiresAt).Scan(&sessionID)
	return sessionID, err
}

func (r *SessionRepo) GetUserIDBySession(ctx context.Context, sessionID string) (string, time.Time, error) {
	var userID string
	var expiresAt time.Time
	err := r.db.QueryRow(ctx, `
		SELECT user_id::text, expires_at
		FROM sessions
		WHERE id = $1
	`, sessionID).Scan(&userID, &expiresAt)
	return userID, expiresAt, err
}

func (r *SessionRepo) Delete(ctx context.Context, sessionID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM sessions WHERE id=$1`, sessionID)
	return err
}

func (r *SessionRepo) CleanupExpired(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `DELETE FROM sessions WHERE expires_at < now()`)
	return err
}
