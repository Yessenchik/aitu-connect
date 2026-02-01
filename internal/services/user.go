// internal/services/user.go (new)
package services

import (
	"errors"

	"4/internal/models"
	"4/internal/storage"
)

// UserService handles user business logic
type UserService struct {
	store *storage.InMemStore
}

// NewUserService creates a new user service
func NewUserService(store *storage.InMemStore) *UserService {
	return &UserService{store: store}
}

// Register creates a new user
func (s *UserService) Register(username, password string) error {
	if username == "" || password == "" {
		return errors.New("username and password required")
	}

	_, exists := s.store.GetUserByUsername(username)
	if exists {
		return errors.New("username already exists")
	}

	user := models.User{
		ID:       s.store.NextUserID(),
		Username: username,
		Password: password,
	}
	if err := user.HashPassword(); err != nil {
		return err
	}

	s.store.AddUser(user)
	return nil
}

// Login authenticates a user and returns user ID
func (s *UserService) Login(username, password string) (int, error) {
	user, exists := s.store.GetUserByUsername(username)
	if !exists || !user.CheckPassword(password) {
		return 0, errors.New("invalid credentials")
	}
	return user.ID, nil
}

// GetUserByID gets a user by ID (used in middleware)
func (s *UserService) GetUserByID(id int) (models.User, bool) {
	return s.store.GetUserByID(id)
}
