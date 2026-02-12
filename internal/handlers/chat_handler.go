//internal/handlers/chat_handler.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"aitu-connect/internal/middleware"
	"aitu-connect/internal/repo"
)

type ChatHandler struct {
	chats    *repo.ChatRepo
	users    *repo.UserRepo
	upgrader websocket.Upgrader
	clients  map[string]map[*websocket.Conn]*clientInfo
	mu       sync.RWMutex
}

type clientInfo struct {
	userID string
}

func NewChatHandler(chats *repo.ChatRepo, users *repo.UserRepo) *ChatHandler {
	return &ChatHandler{
		chats: chats,
		users: users,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		clients: make(map[string]map[*websocket.Conn]*clientInfo),
	}
}

func (h *ChatHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	convs, err := h.chats.GetUserConversations(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	if convs == nil {
		convs = []repo.Conversation{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(convs)
}

func (h *ChatHandler) GetOrCreateConversation(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	otherUserID := r.URL.Query().Get("other_user_id")
	if otherUserID == "" {
		writeJSON(w, 400, map[string]string{"error": "other_user_id is required"})
		return
	}

	convID, err := h.chats.GetOrCreateConversation(r.Context(), userID, otherUserID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 200, map[string]string{"conversation_id": convID})
}

func (h *ChatHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	conversationID := r.URL.Query().Get("conversation_id")
	if conversationID == "" {
		writeJSON(w, 400, map[string]string{"error": "conversation_id is required"})
		return
	}

	messages, err := h.chats.GetMessages(r.Context(), conversationID, 100)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	if messages == nil {
		messages = []repo.Message{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *ChatHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	users, err := h.chats.GetAllUsers(r.Context(), userID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	if users == nil {
		users = []repo.User{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

type wsMessage struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversation_id"`
	Content        string `json:"content"`
}

func (h *ChatHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	var currentConvID string

	for {
		var msg wsMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("WebSocket read error:", err)
			h.removeClient(currentConvID, conn)
			break
		}

		switch msg.Type {
		case "join":
			if currentConvID != "" {
				h.removeClient(currentConvID, conn)
			}
			currentConvID = msg.ConversationID
			h.addClient(currentConvID, conn, userID)

		case "message":
			if msg.ConversationID == "" || msg.Content == "" {
				continue
			}

			msgID, err := h.chats.SaveMessage(r.Context(), msg.ConversationID, userID, msg.Content)
			if err != nil {
				log.Println("Error saving message:", err)
				continue
			}

			// Get user info
			user, err := h.users.GetByID(r.Context(), userID)
			if err != nil {
				log.Println("Error getting user:", err)
				continue
			}

			broadcast := map[string]interface{}{
				"type":              "message",
				"id":                msgID,
				"conversation_id":   msg.ConversationID,
				"user_id":           userID,
				"content":           msg.Content,
				"author_first_name": user.FirstName,
				"author_last_name":  user.LastName,
				"created_at":        time.Now().Format(time.RFC3339),
			}

			h.broadcastToConversation(msg.ConversationID, broadcast)
		}
	}
}

func (h *ChatHandler) addClient(convID string, conn *websocket.Conn, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[convID] == nil {
		h.clients[convID] = make(map[*websocket.Conn]*clientInfo)
	}
	h.clients[convID][conn] = &clientInfo{userID: userID}
}

func (h *ChatHandler) removeClient(convID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[convID] != nil {
		delete(h.clients[convID], conn)
		if len(h.clients[convID]) == 0 {
			delete(h.clients, convID)
		}
	}
}

func (h *ChatHandler) broadcastToConversation(convID string, msg interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.clients[convID]; ok {
		for conn := range clients {
			err := conn.WriteJSON(msg)
			if err != nil {
				log.Println("Error broadcasting:", err)
				conn.Close()
				delete(clients, conn)
			}
		}
	}
}