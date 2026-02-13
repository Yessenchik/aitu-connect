package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"aitu-connect/internal/middleware"
	"aitu-connect/internal/repo"
)

type PostHandler struct {
	posts *repo.PostRepo
}

func NewPostHandler(posts *repo.PostRepo) *PostHandler {
	return &PostHandler{posts: posts}
}

type createPostReq struct {
	Content string `json:"content"`
}

type addCommentReq struct {
	PostID  string `json:"post_id"`
	Content string `json:"content"`
}

func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	var req createPostReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}

	if req.Content == "" {
		writeJSON(w, 400, map[string]string{"error": "content is required"})
		return
	}

	id, err := h.posts.Create(r.Context(), userID, req.Content)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 201, map[string]string{"id": id})
}

func (h *PostHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	posts, err := h.posts.GetFeed(r.Context(), userID, limit, offset)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	if posts == nil {
		posts = []repo.Post{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

func (h *PostHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		writeJSON(w, 400, map[string]string{"error": "post_id is required"})
		return
	}

	isLiked, err := h.posts.ToggleLike(r.Context(), userID, postID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 200, map[string]bool{"liked": isLiked})
}

func (h *PostHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}

	var req addCommentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}

	if req.PostID == "" || req.Content == "" {
		writeJSON(w, 400, map[string]string{"error": "post_id and content are required"})
		return
	}

	id, err := h.posts.AddComment(r.Context(), userID, req.PostID, req.Content)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 201, map[string]string{"id": id})
}

func (h *PostHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Query().Get("post_id")
	if postID == "" {
		writeJSON(w, 400, map[string]string{"error": "post_id is required"})
		return
	}

	comments, err := h.posts.GetComments(r.Context(), postID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	if comments == nil {
		comments = []repo.Comment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}
