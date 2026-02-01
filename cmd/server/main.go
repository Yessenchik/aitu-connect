package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"aitu-connect/internal/db"
	"aitu-connect/internal/handlers"
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

	userRepo := repo.NewUserRepo(pool)
	sessRepo := repo.NewSessionRepo(pool)
	authSvc := services.NewAuthService(userRepo, sessRepo)
	authH := handlers.NewAuthHandler(authSvc)

	mux := http.NewServeMux()

	// API

	// 1) Entry route "/"
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if isLoggedIn(r, sessRepo) {
			http.Redirect(w, r, "/dashboard/", http.StatusFound)
			return
		}
		http.Redirect(w, r, "/auth/", http.StatusFound)
	})

	// 2) Auth page "/auth/"
	mux.HandleFunc("GET /auth/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./frontend/auth/index.html")
	})

	// 3) Dashboard page "/dashboard/" (protected)
	mux.HandleFunc("GET /dashboard/", func(w http.ResponseWriter, r *http.Request) {
		if !isLoggedIn(r, sessRepo) {
			http.Redirect(w, r, "/auth/", http.StatusFound)
			return
		}
		http.ServeFile(w, r, "./frontend/dashboard/index.html")
	})

	// Static files (optional)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./frontend/static"))))

	mux.HandleFunc("POST /api/auth/signup", authH.SignUp)
	mux.HandleFunc("POST /api/auth/login", authH.SignIn)
	mux.HandleFunc("POST /api/auth/logout", authH.Logout)

	// Frontend static pages
	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	log.Println("server on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

func isLoggedIn(r *http.Request, sessRepo *repo.SessionRepo) bool {
	c, err := r.Cookie("sid")
	if err != nil || c.Value == "" {
		return false
	}

	userID, expiresAt, err := sessRepo.GetUserIDBySession(r.Context(), c.Value)
	if err != nil || userID == "" {
		return false
	}
	if time.Now().After(expiresAt) {
		return false
	}
	return true
}
