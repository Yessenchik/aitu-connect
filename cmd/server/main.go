package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"aitu-connect/internal/db"
	"aitu-connect/internal/handlers"
	"aitu-connect/internal/middleware"
	"aitu-connect/internal/repo"
	"aitu-connect/internal/services"
)

func main() {
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL is required")
	}

	pool, err := db.NewPool()
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// Repositories
	userRepo := repo.NewUserRepo(pool)
	sessRepo := repo.NewSessionRepo(pool)
	postRepo := repo.NewPostRepo(pool)
	chatRepo := repo.NewChatRepo(pool)

	// Services
	authSvc := services.NewAuthService(userRepo, sessRepo)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc)
	profileH := handlers.NewProfileHandler(userRepo)
	postH := handlers.NewPostHandler(postRepo)
	chatH := handlers.NewChatHandler(chatRepo, userRepo)

	mux := http.NewServeMux()

	// Auth API
	mux.HandleFunc("POST /api/auth/signup", authH.SignUp)
	mux.HandleFunc("POST /api/auth/login", authH.SignIn)
	mux.HandleFunc("POST /api/auth/logout", authH.Logout)

	// Profile API
	mux.Handle("GET /api/me", middleware.RequireAuth(sessRepo, http.HandlerFunc(profileH.Me)))

	// Posts API
	mux.Handle("GET /api/posts/feed", middleware.RequireAuth(sessRepo, http.HandlerFunc(postH.GetFeed)))
	mux.Handle("POST /api/posts", middleware.RequireAuth(sessRepo, http.HandlerFunc(postH.CreatePost)))
	mux.Handle("POST /api/posts/like", middleware.RequireAuth(sessRepo, http.HandlerFunc(postH.ToggleLike)))
	mux.Handle("POST /api/posts/comment", middleware.RequireAuth(sessRepo, http.HandlerFunc(postH.AddComment)))
	mux.Handle("GET /api/posts/comments", middleware.RequireAuth(sessRepo, http.HandlerFunc(postH.GetComments)))

	// Chat API
	mux.Handle("GET /api/chat/conversations", middleware.RequireAuth(sessRepo, http.HandlerFunc(chatH.GetConversations)))
	mux.Handle("GET /api/chat/conversation", middleware.RequireAuth(sessRepo, http.HandlerFunc(chatH.GetOrCreateConversation)))
	mux.Handle("GET /api/chat/messages", middleware.RequireAuth(sessRepo, http.HandlerFunc(chatH.GetMessages)))
	mux.Handle("GET /api/chat/users", middleware.RequireAuth(sessRepo, http.HandlerFunc(chatH.GetAllUsers)))
	mux.Handle("GET /api/chat/ws", middleware.RequireAuth(sessRepo, http.HandlerFunc(chatH.HandleWebSocket)))

	// Serve static files with SPA fallback
	mux.HandleFunc("/", spaHandler("./frontend/build"))

	// CORS middleware
	handler := corsMiddleware(mux)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

// SPA Handler - returns index.html for all non-API routes
func spaHandler(buildDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Build the full path
		path := filepath.Join(buildDir, r.URL.Path)

		// Check if path exists and is a file
		fileInfo, err := os.Stat(path)
		if err == nil && !fileInfo.IsDir() {
			// Serve the file
			http.ServeFile(w, r, path)
			return
		}

		// For all other routes (including /dashboard/*), serve index.html
		indexPath := filepath.Join(buildDir, "index.html")
		http.ServeFile(w, r, indexPath)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}