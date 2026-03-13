package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/handlers"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/middleware"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load()
	fmt.Println("Environment configuration loaded.")

	dbUrl := os.Getenv("DATABASE_URL")
	var dbConfig string

	if dbUrl != "" {
		dbConfig = dbUrl
	} else {
		dbHost := os.Getenv("DB_HOST")
		if dbHost == "" {
			dbHost = "localhost"
		}
		dbConfig = fmt.Sprintf("host=%s user=postgres password=password dbname=carehelp_db port=5432 sslmode=disable", dbHost)
	}

	// Retry connecting to the database (gives postgres time to start in Docker)
	var db *gorm.DB
	var err error
	for attempt := 1; attempt <= 5; attempt++ {
		db, err = gorm.Open(postgres.Open(dbConfig), &gorm.Config{})
		if err == nil {
			break
		}
		fmt.Printf("Database not ready (attempt %d/5), retrying in 3s...\n", attempt)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("CRITICAL: Unable to connect to database after 5 attempts: %v", err)
	}
	fmt.Println("Database connection established successfully!")

	fmt.Println("Running Database Automigrations...")
	err = db.AutoMigrate(&models.User{}, &models.Community{}, &models.Post{}, &models.Comment{}, &models.Interaction{}, &models.Notification{})
	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}
	fmt.Println("Database migration completed!")

	// -----------------------------------------------------------------
	// SEED DEFAULT DATA
	// -----------------------------------------------------------------
	var communityCount int64
	db.Model(&models.Community{}).Count(&communityCount)
	if communityCount == 0 {
		fmt.Println("Seeding default communities...")
		db.Create(&models.Community{Name: "General", Description: "General Discussion"})
		db.Create(&models.Community{Name: "Volunteers", Description: "Volunteer Operations"})
		db.Create(&models.Community{Name: "Beneficiaries", Description: "Support & Assistance"})
	}

	// -----------------------------------------------------------------
	// DEPENDENCY INJECTION
	// -----------------------------------------------------------------
	interactionRepo := repositories.NewInteractionRepository(db)

	userRepo := repositories.NewUserRepository(db)
	userService := services.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService, interactionRepo)

	notificationRepo := repositories.NewNotificationRepository(db)
	notificationService := services.NewNotificationService(notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	postRepo := repositories.NewPostRepository(db)
	postService := services.NewPostService(postRepo, userRepo, notificationService)

	commentRepo := repositories.NewCommentRepository(db)
	commentService := services.NewCommentService(commentRepo, userRepo, postRepo, notificationService)

	communityRepo := repositories.NewCommunityRepository(db)
	communityServiceDI := services.NewCommunityService(communityRepo)
	communityHandler := handlers.NewCommunityHandler(communityServiceDI)

	postHandler := handlers.NewPostHandler(postService, interactionRepo, notificationService)
	commentHandler := handlers.NewCommentHandler(commentService, interactionRepo)

	// -----------------------------------------------------------------
	uploadHandler := handlers.NewUploadHandler()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"online","project":"CareHelp SG VWO Platform"}`))
	})

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error": "API route not found"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"Welcome to CareHelp SG Backend API! The server is running successfully."}`))
	})

	// Serve physical uploaded files to the frontend UI
	fs := http.FileServer(http.Dir("./uploads"))
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads", fs))

	// Core API Group
	mux.HandleFunc("POST /api/users/register", userHandler.Register)
	mux.HandleFunc("POST /api/users/login", userHandler.Login)
	mux.HandleFunc("POST /api/users/google-login", userHandler.GoogleLogin)
	mux.HandleFunc("GET /api/users/check-username", userHandler.CheckUsernameAvailability)

	// Media Handling
	mux.HandleFunc("POST /api/upload", uploadHandler.UploadFile)

	mux.HandleFunc("GET /api/posts", postHandler.ListPosts)
	mux.HandleFunc("GET /api/posts/{id}", postHandler.GetPost)
	mux.HandleFunc("POST /api/posts/{id}/upvote", postHandler.UpvotePost)
	mux.HandleFunc("POST /api/posts/{id}/unupvote", postHandler.UnupvotePost)
	mux.HandleFunc("POST /api/posts/{id}/dislike", postHandler.DislikePost)
	mux.HandleFunc("POST /api/posts/{id}/undislike", postHandler.UndislikePost)
	mux.HandleFunc("POST /api/posts/{id}/repost", postHandler.RepostPost)     // Atomic UI Interaction
	mux.HandleFunc("POST /api/posts/{id}/unrepost", postHandler.UnrepostPost) // Atomic UI Interaction
	mux.HandleFunc("POST /api/posts/{id}/react", postHandler.ReactPost)       // Atomic UI Interaction
	mux.HandleFunc("GET /api/posts/{id}/comments", commentHandler.GetPostComments)
	mux.HandleFunc("GET /api/users/public/{username}", userHandler.GetPublicProfile)
	mux.HandleFunc("GET /api/users/public/{username}/posts", postHandler.GetPostsByUsername) // Get posts by a specific user

	mux.HandleFunc("GET /api/communities", communityHandler.GetList)

	// Protected Routes (Wrapped in RequireJWT)
	withAuth := middleware.RequireJWT()

	mux.Handle("GET /api/users/profile", withAuth(http.HandlerFunc(userHandler.GetProfile)))
	mux.Handle("PUT /api/users/profile", withAuth(http.HandlerFunc(userHandler.UpdateProfile)))
	mux.Handle("DELETE /api/users/profile", withAuth(http.HandlerFunc(userHandler.DeleteProfile)))

	mux.Handle("POST /api/posts", withAuth(http.HandlerFunc(postHandler.CreatePost)))
	mux.Handle("GET /api/posts/archived", withAuth(http.HandlerFunc(postHandler.GetArchivedPosts)))
	mux.Handle("PUT /api/posts/{id}", withAuth(http.HandlerFunc(postHandler.UpdatePost)))
	mux.Handle("DELETE /api/posts/{id}", withAuth(http.HandlerFunc(postHandler.DeletePost)))

	mux.Handle("POST /api/posts/{id}/restore", withAuth(http.HandlerFunc(postHandler.RestorePost)))
	mux.Handle("POST /api/posts/{id}/pin", withAuth(http.HandlerFunc(postHandler.PinPost)))

	mux.Handle("POST /api/comments", withAuth(http.HandlerFunc(commentHandler.CreateComment)))
	mux.Handle("PUT /api/comments/{id}", withAuth(http.HandlerFunc(commentHandler.UpdateComment)))
	mux.Handle("DELETE /api/comments/{id}", withAuth(http.HandlerFunc(commentHandler.DeleteComment)))
	mux.Handle("POST /api/comments/{id}/pin", withAuth(http.HandlerFunc(commentHandler.PinComment)))
	mux.Handle("POST /api/comments/{id}/love", withAuth(http.HandlerFunc(commentHandler.LoveComment)))
	mux.Handle("POST /api/comments/{id}/unlove", withAuth(http.HandlerFunc(commentHandler.UnloveComment)))

	mux.Handle("GET /api/notifications", withAuth(http.HandlerFunc(notificationHandler.GetMyNotifications)))
	mux.Handle("PUT /api/notifications/{id}/read", withAuth(http.HandlerFunc(notificationHandler.MarkAsRead)))
	mux.Handle("PUT /api/notifications/read-all", withAuth(http.HandlerFunc(notificationHandler.MarkAllAsRead)))

	mux.Handle("POST /api/communities", withAuth(http.HandlerFunc(communityHandler.Create)))
	mux.Handle("PUT /api/communities/{id}", withAuth(http.HandlerFunc(communityHandler.Update)))
	mux.Handle("DELETE /api/communities/{id}", withAuth(http.HandlerFunc(communityHandler.Delete)))
	mux.Handle("POST /api/communities/{id}/join", withAuth(http.HandlerFunc(communityHandler.JoinCommunity)))
	mux.Handle("GET /api/users/me/communities", withAuth(http.HandlerFunc(communityHandler.GetUserCommunities)))

	fmt.Println("CareHelp API is now listening on port 8080...")

	// Wrap entire mux with CORS proxy
	handler := middleware.CORS()(mux)

	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatalf("Server shutdown unexpectedly: %v", err)
	}
}
