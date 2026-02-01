// internal/models/post.go (renamed and updated from task.go)
package models

import "time"

// Post represents a post by a user
type Post struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}
