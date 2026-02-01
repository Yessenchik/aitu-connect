package services

import (
	"context"
	"errors"
	"regexp"
	"time"

	"golang.org/x/crypto/bcrypt"

	"aitu-connect/internal/repo"
)

var (
	ErrBadName         = errors.New("first name and last name are required")
	ErrInvalidEmail    = errors.New("invalid AITU email")
	ErrEmailTaken      = errors.New("email already registered")
	ErrBadCredentials  = errors.New("wrong email or password")
	ErrWeakPassword    = errors.New("password too short")
	aituEmailRegex     = regexp.MustCompile(`^\d{4,12}@astanait\.edu\.kz$`)
	defaultSessionLife = 7 * 24 * time.Hour
)

type AuthService struct {
	users    *repo.UserRepo
	sessions *repo.SessionRepo
}

func NewAuthService(users *repo.UserRepo, sessions *repo.SessionRepo) *AuthService {
	return &AuthService{users: users, sessions: sessions}
}

func (s *AuthService) SignUp(ctx context.Context, email, password, role, firstName, lastName, bio string) (string, error) {
	if !aituEmailRegex.MatchString(email) {
		return "", ErrInvalidEmail
	}
	if len(password) < 8 {
		return "", ErrWeakPassword
	}
	if firstName == "" || lastName == "" {
		return "", ErrBadName
	}
	if role == "" {
		role = "student"
	}

	exists, err := s.users.ExistsByEmail(ctx, email)
	if err != nil {
		return "", err
	}
	if exists {
		return "", ErrEmailTaken
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return s.users.Create(ctx, email, string(hashBytes), role, firstName, lastName, bio)
}

func (s *AuthService) SignIn(ctx context.Context, email, password string) (sessionID string, err error) {
	u, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return "", ErrBadCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return "", ErrBadCredentials
	}

	expiresAt := time.Now().Add(defaultSessionLife)
	return s.sessions.Create(ctx, u.ID, expiresAt)
}

func (s *AuthService) Logout(ctx context.Context, sessionID string) error {
	return s.sessions.Delete(ctx, sessionID)
}
