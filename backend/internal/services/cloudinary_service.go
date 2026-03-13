package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type CloudinaryService struct {
	client *cloudinary.Cloudinary
}

func NewCloudinaryService() (*CloudinaryService, error) {
	url := os.Getenv("CLOUDINARY_URL")
	if url == "" {
		return nil, fmt.Errorf("CLOUDINARY_URL environment variable is not set")
	}

	cld, err := cloudinary.NewFromURL(url)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	return &CloudinaryService{client: cld}, nil
}

// UploadImage uploads a file to Cloudinary and returns the secure URL
func (s *CloudinaryService) UploadImage(ctx context.Context, file multipart.File, filename string) (string, error) {
	uploadParams := uploader.UploadParams{
		Folder:   "carehelp",
		PublicID: filename,
	}

	resp, err := s.client.Upload.Upload(ctx, file, uploadParams)
	if err != nil {
		return "", fmt.Errorf("failed to upload file to Cloudinary: %w", err)
	}

	return resp.SecureURL, nil
}
