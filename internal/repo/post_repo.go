package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Post struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	// Joined fields
	AuthorFirstName string `json:"author_first_name"`
	AuthorLastName  string `json:"author_last_name"`
	AuthorEmail     string `json:"author_email"`
	LikesCount      int    `json:"likes_count"`
	CommentsCount   int    `json:"comments_count"`
	IsLikedByMe     bool   `json:"is_liked_by_me"`
}

type Comment struct {
	ID              string    `json:"id"`
	PostID          string    `json:"post_id"`
	UserID          string    `json:"user_id"`
	Content         string    `json:"content"`
	CreatedAt       time.Time `json:"created_at"`
	AuthorFirstName string    `json:"author_first_name"`
	AuthorLastName  string    `json:"author_last_name"`
}

type PostRepo struct {
	db *pgxpool.Pool
}

func NewPostRepo(db *pgxpool.Pool) *PostRepo {
	return &PostRepo{db: db}
}

func (r *PostRepo) Create(ctx context.Context, userID, content string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO posts (user_id, content)
		VALUES ($1, $2)
		RETURNING id
	`, userID, content).Scan(&id)
	return id, err
}

func (r *PostRepo) GetFeed(ctx context.Context, currentUserID string, limit, offset int) ([]Post, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			p.id::text,
			p.user_id::text,
			p.content,
			p.created_at,
			p.updated_at,
			u.first_name,
			u.last_name,
			u.email,
			COALESCE(l.likes_count, 0) as likes_count,
			COALESCE(c.comments_count, 0) as comments_count,
			EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1::uuid) as is_liked
		FROM posts p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN (
			SELECT post_id, COUNT(*) as likes_count
			FROM likes
			GROUP BY post_id
		) l ON l.post_id = p.id
		LEFT JOIN (
			SELECT post_id, COUNT(*) as comments_count
			FROM comments
			GROUP BY post_id
		) c ON c.post_id = p.id
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, currentUserID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		err := rows.Scan(
			&p.ID, &p.UserID, &p.Content, &p.CreatedAt, &p.UpdatedAt,
			&p.AuthorFirstName, &p.AuthorLastName, &p.AuthorEmail,
			&p.LikesCount, &p.CommentsCount, &p.IsLikedByMe,
		)
		if err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, nil
}

func (r *PostRepo) ToggleLike(ctx context.Context, userID, postID string) (bool, error) {
	// Check if already liked
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = $1::uuid AND post_id = $2::uuid)
	`, userID, postID).Scan(&exists)
	if err != nil {
		return false, err
	}

	if exists {
		// Unlike
		_, err = r.db.Exec(ctx, `DELETE FROM likes WHERE user_id = $1::uuid AND post_id = $2::uuid`, userID, postID)
		return false, err
	}

	// Like
	_, err = r.db.Exec(ctx, `INSERT INTO likes (user_id, post_id) VALUES ($1::uuid, $2::uuid)`, userID, postID)
	return true, err
}

func (r *PostRepo) AddComment(ctx context.Context, userID, postID, content string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO comments (user_id, post_id, content)
		VALUES ($1::uuid, $2::uuid, $3)
		RETURNING id
	`, userID, postID, content).Scan(&id)
	return id, err
}

func (r *PostRepo) GetComments(ctx context.Context, postID string) ([]Comment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			c.id::text,
			c.post_id::text,
			c.user_id::text,
			c.content,
			c.created_at,
			u.first_name,
			u.last_name
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = $1::uuid
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.AuthorFirstName, &c.AuthorLastName)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}
