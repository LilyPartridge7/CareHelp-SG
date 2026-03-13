package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
)

type UploadHandler struct {
	cloudinarySvc *services.CloudinaryService
}

func NewUploadHandler() *UploadHandler {
	svc, err := services.NewCloudinaryService()
	if err != nil {
		log.Printf("Warning: Failed to initialize Cloudinary service: %v", err)
		// We still return the handler, it will just fail gracefully on upload if svc is nil or we can handle it
	}
	return &UploadHandler{cloudinarySvc: svc}
}

func (h *UploadHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "error retrieving image from form")
		return
	}
	defer file.Close()

	// Create a unique filename prefix to prevent collisions
	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(header.Filename))

	var apiURL string

	if h.cloudinarySvc != nil {
		// Upload to Cloudinary
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		secureURL, err := h.cloudinarySvc.UploadImage(ctx, file, filename)
		if err != nil {
			log.Printf("Cloudinary upload failed: %v", err)
			utils.RespondError(w, http.StatusInternalServerError, "failed to upload file to cloud storage")
			return
		}
		apiURL = secureURL
	} else {
		utils.RespondError(w, http.StatusInternalServerError, "cloud storage service is unavailable")
		return
	}

	// Return the secure Cloudinary URL so the frontend can store it in the DB and render it
	utils.RespondJSON(w, http.StatusOK, map[string]string{
		"message":   "file uploaded successfully",
		"image_url": apiURL,
	})
}
