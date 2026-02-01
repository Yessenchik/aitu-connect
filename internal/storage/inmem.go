// internal/storage/inmem.go (updated for posts)
package storage

import (
	"sync"

	"4/internal/models"
)

// InMemStore is thread-safe in-memory storage
type InMemStore struct {
	users      map[string]models.User // Key: username
	usersByID  map[int]models.User    // Key: user ID
	posts      map[int]models.Post    // Key: post ID
	userPosts  map[int][]int          // Key: user ID, Value: list of post IDs
	allPosts   []models.Post          // For simple feed (all posts)
	nextUserID int
	nextPostID int
	mu         sync.Mutex
}

// NewInMemStore creates a new store
func NewInMemStore() *InMemStore {
	return &InMemStore{
		users:     make(map[string]models.User),
		usersByID: make(map[int]models.User),
		posts:     make(map[int]models.Post),
		userPosts: make(map[int][]int),
	}
}

// NextUserID gets next user ID
func (s *InMemStore) NextUserID() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextUserID++
	return s.nextUserID
}

// NextPostID gets next post ID
func (s *InMemStore) NextPostID() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextPostID++
	return s.nextPostID
}

// AddUser adds a user
func (s *InMemStore) AddUser(user models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[user.Username] = user
	s.usersByID[user.ID] = user
}

// GetUserByUsername gets a user by username
func (s *InMemStore) GetUserByUsername(username string) (models.User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, exists := s.users[username]
	return user, exists
}

// GetUserByID gets a user by ID
func (s *InMemStore) GetUserByID(id int) (models.User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, exists := s.usersByID[id]
	return user, exists
}

// AddPost adds a post
func (s *InMemStore) AddPost(post models.Post) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.posts[post.ID] = post
	s.userPosts[post.UserID] = append(s.userPosts[post.UserID], post.ID)
	s.allPosts = append(s.allPosts, post) // For feed
}

// GetAllPosts gets all posts
func (s *InMemStore) GetAllPosts() []models.Post {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]models.Post(nil), s.allPosts...) // Copy
}

// DeletePost deletes a post if owned by user
func (s *InMemStore) DeletePost(userID, postID int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	post, exists := s.posts[postID]
	if !exists || post.UserID != userID {
		return false
	}
	delete(s.posts, postID)
	// Remove from userPosts
	for i, id := range s.userPosts[userID] {
		if id == postID {
			s.userPosts[userID] = append(s.userPosts[userID][:i], s.userPosts[userID][i+1:]...)
			break
		}
	}
	// Remove from allPosts
	for i, p := range s.allPosts {
		if p.ID == postID {
			s.allPosts = append(s.allPosts[:i], s.allPosts[i+1:]...)
			break
		}
	}
	return true
}
