// main.go (updated endpoint names to /api/posts)
package main

import (
	"log"
	"net/http"
	"sync"

	"4/internal/handlers"
	"4/internal/middleware"
	"4/internal/services"
	"4/internal/storage"
)

var (
	requestLogChan = make(chan string, 100) // Channel for background logging
	wg             sync.WaitGroup
)

func main() {
	// Initialize storage and services
	store := storage.NewInMemStore()
	userService := services.NewUserService(store)
	postService := services.NewPostService(store)

	// Start background logger goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for msg := range requestLogChan {
			log.Printf("Background log: %s", msg)
		}
	}()

	// Setup HTTP server
	mux := http.NewServeMux()

	// Public auth endpoints (no middleware)
	mux.HandleFunc("POST /api/register", func(w http.ResponseWriter, r *http.Request) {
		requestLogChan <- "Handled /api/register"
		handlers.RegisterHandler(userService, w, r)
	})
	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		requestLogChan <- "Handled /api/login"
		handlers.LoginHandler(userService, w, r)
	})

	// Protected post endpoints (with auth middleware)
	postHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestLogChan <- "Handled /api/posts"
		switch r.Method {
		case "GET":
			handlers.GetPostsHandler(postService, w, r)
		case "POST":
			handlers.CreatePostHandler(postService, w, r)
		case "DELETE":
			handlers.DeletePostHandler(postService, w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.Handle("/api/posts", middleware.AuthMiddleware(store)(postHandler))

	// Serve static files for frontend
	mux.Handle("/", http.FileServer(http.Dir("static")))

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}

	close(requestLogChan)
	wg.Wait()
}
