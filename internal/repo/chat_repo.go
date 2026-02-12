//internal/repo/chat_repo.go
package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Conversation struct {
	ID        string    `json:"id"`
	IsGroup   bool      `json:"is_group"`
	Name      string    `json:"name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	// For 1-on-1 chats
	OtherUserID        string `json:"other_user_id,omitempty"`
	OtherUserFirstName string `json:"other_user_first_name,omitempty"`
	OtherUserLastName  string `json:"other_user_last_name,omitempty"`
	LastMessage        string `json:"last_message,omitempty"`
	LastMessageTime    *time.Time `json:"last_message_time,omitempty"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	UserID         string    `json:"user_id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
	AuthorFirstName string   `json:"author_first_name"`
	AuthorLastName  string   `json:"author_last_name"`
}

type ChatRepo struct {
	db *pgxpool.Pool
}

func NewChatRepo(db *pgxpool.Pool) *ChatRepo {
	return &ChatRepo{db: db}
}

func (r *ChatRepo) GetUserConversations(ctx context.Context, userID string) ([]Conversation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			c.id::text,
			c.is_group,
			COALESCE(c.name, ''),
			c.created_at,
			CASE WHEN c.is_group = false THEN
				(SELECT u.id::text FROM users u
				 JOIN conversation_participants cp2 ON cp2.user_id = u.id
				 WHERE cp2.conversation_id = c.id AND u.id != $1::uuid
				 LIMIT 1)
			ELSE ''
			END as other_user_id,
			CASE WHEN c.is_group = false THEN
				(SELECT u.first_name FROM users u
				 JOIN conversation_participants cp2 ON cp2.user_id = u.id
				 WHERE cp2.conversation_id = c.id AND u.id != $1::uuid
				 LIMIT 1)
			ELSE ''
			END as other_first_name,
			CASE WHEN c.is_group = false THEN
				(SELECT u.last_name FROM users u
				 JOIN conversation_participants cp2 ON cp2.user_id = u.id
				 WHERE cp2.conversation_id = c.id AND u.id != $1::uuid
				 LIMIT 1)
			ELSE ''
			END as other_last_name
		FROM conversations c
		JOIN conversation_participants cp ON cp.conversation_id = c.id
		WHERE cp.user_id = $1::uuid
		ORDER BY c.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []Conversation
	for rows.Next() {
		var c Conversation
		err := rows.Scan(&c.ID, &c.IsGroup, &c.Name, &c.CreatedAt,
			&c.OtherUserID, &c.OtherUserFirstName, &c.OtherUserLastName)
		if err != nil {
			return nil, err
		}
		convs = append(convs, c)
	}
	return convs, nil
}

func (r *ChatRepo) GetOrCreateConversation(ctx context.Context, userID, otherUserID string) (string, error) {
	// Check if conversation already exists
	var convID string
	err := r.db.QueryRow(ctx, `
		SELECT c.id::text
		FROM conversations c
		JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
		JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
		WHERE c.is_group = false
		  AND cp1.user_id = $1::uuid
		  AND cp2.user_id = $2::uuid
		LIMIT 1
	`, userID, otherUserID).Scan(&convID)

	if err == nil {
		return convID, nil
	}

	// Create new conversation
	err = r.db.QueryRow(ctx, `
		INSERT INTO conversations (is_group)
		VALUES (false)
		RETURNING id
	`).Scan(&convID)
	if err != nil {
		return "", err
	}

	// Add participants
	_, err = r.db.Exec(ctx, `
		INSERT INTO conversation_participants (conversation_id, user_id)
		VALUES ($1::uuid, $2::uuid), ($1::uuid, $3::uuid)
	`, convID, userID, otherUserID)

	return convID, err
}

func (r *ChatRepo) GetMessages(ctx context.Context, conversationID string, limit int) ([]Message, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			m.id::text,
			m.conversation_id::text,
			m.user_id::text,
			m.content,
			m.created_at,
			u.first_name,
			u.last_name
		FROM messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.conversation_id = $1::uuid
		ORDER BY m.created_at DESC
		LIMIT $2
	`, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		err := rows.Scan(&m.ID, &m.ConversationID, &m.UserID, &m.Content, &m.CreatedAt,
			&m.AuthorFirstName, &m.AuthorLastName)
		if err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (r *ChatRepo) SaveMessage(ctx context.Context, conversationID, userID, content string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO messages (conversation_id, user_id, content)
		VALUES ($1::uuid, $2::uuid, $3)
		RETURNING id
	`, conversationID, userID, content).Scan(&id)
	return id, err
}

func (r *ChatRepo) GetAllUsers(ctx context.Context, currentUserID string) ([]User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id::text, email, first_name, last_name, role
		FROM users
		WHERE id != $1::uuid
		ORDER BY first_name, last_name
	`, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Role)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}