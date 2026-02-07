package repo

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	PasswordHash string
	Role         string `json:"role"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Bio          string `json:"bio"`
	AvatarURL    string `json:"avatar_url"`
}

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, email, passwordHash, role, firstName, lastName, bio string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
        INSERT INTO users (email, password_hash, role, first_name, last_name, bio)
        VALUES ($1, $2, $3, $4, $5, NULLIF($6,''))
        RETURNING id
    `, email, passwordHash, role, firstName, lastName, bio).Scan(&id)
	return id, err
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, role
		FROM users
		WHERE email = $1
	`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)`, email).Scan(&exists)
	return exists, err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*User, error) {
	u := &User{}
	err := r.db.QueryRow(ctx, `
		SELECT
		  id::text,
		  email,
		  password_hash,
		  role,
		  COALESCE(first_name, ''),
		  COALESCE(last_name, ''),
		  COALESCE(bio, ''),
		  COALESCE(avatar_url, '')
		FROM users
		WHERE id = $1::uuid
	`, id).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.FirstName,
		&u.LastName,
		&u.Bio,
		&u.AvatarURL,
	)
	if err != nil {
		return nil, err
	}
	return u, nil
}
