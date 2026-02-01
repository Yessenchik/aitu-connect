// internal/services/post.go (renamed and updated from task.go)
package services

import (
	"errors"
	"time"

	"4/internal/models"
	"4/internal/storage"
)

// PostService handles post business logic
type PostService struct {
	store *storage.InMemStore
}

// NewPostService creates a new post service
func NewPostService(store *storage.InMemStore) *PostService {
	return &PostService{store: store}
}

// GetAllPosts gets all posts (for feed)
func (s *PostService) GetAllPosts() ([]models.Post, error) {
	return s.store.GetAllPosts(), nil
}

// CreatePost creates a new post for a user
func (s *PostService) CreatePost(userID int, content string) (models.Post, error) {
	if content == "" {
		return models.Post{}, errors.New("content required")
	}

	post := models.Post{
		ID:        s.store.NextPostID(),
		UserID:    userID,
		Content:   content,
		CreatedAt: time.Now(),
	}
	s.store.AddPost(post)
	return post, nil
}

// DeletePost deletes a post if owned by user
func (s *PostService) DeletePost(userID, postID int) error {
	if !s.store.DeletePost(userID, postID) {
		return errors.New("post not found or not owned")
	}
	return nil
}
