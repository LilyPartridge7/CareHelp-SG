package handlers_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/handlers"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
)

// MockUserService implements services.UserService strictly for testing
type MockUserService struct {
	RegisterFunc                   func(username string) (*models.User, error)
	LoginFunc                      func(username string) (string, error)
	GoogleLoginFunc                func(token string) (string, error)
	CheckUsernameAvailabilityFunc  func(username string) (bool, error)
	GetProfileFunc                 func(userID uint) (*models.User, error)
	UpdateProfileFunc              func(userID uint, req *services.UpdateProfileRequest) (*models.User, error)
	GetPublicProfileByUsernameFunc func(username string) (*models.User, error)
	DeleteProfileFunc              func(userID uint) error
}

func (m *MockUserService) RegisterUser(req *services.RegisterUserRequest) (*models.User, error) {
	if m.RegisterFunc != nil {
		return m.RegisterFunc(req.Username)
	}
	return nil, nil
}

func (m *MockUserService) LoginUser(req *services.LoginUserRequest) (string, error) {
	if m.LoginFunc != nil {
		return m.LoginFunc(req.Username)
	}
	return "", nil
}

func (m *MockUserService) GoogleLoginUser(req *services.GoogleLoginRequest) (string, error) {
	if m.GoogleLoginFunc != nil {
		return m.GoogleLoginFunc(req.AccessToken)
	}
	return "", nil
}

func (m *MockUserService) CheckUsernameAvailability(username string) (bool, error) {
	if m.CheckUsernameAvailabilityFunc != nil {
		return m.CheckUsernameAvailabilityFunc(username)
	}
	return true, nil
}

func (m *MockUserService) GetProfile(userID uint) (*models.User, error) {
	if m.GetProfileFunc != nil {
		return m.GetProfileFunc(userID)
	}
	return nil, nil
}

func (m *MockUserService) UpdateProfile(userID uint, req *services.UpdateProfileRequest) (*models.User, error) {
	if m.UpdateProfileFunc != nil {
		return m.UpdateProfileFunc(userID, req)
	}
	return nil, nil
}

func (m *MockUserService) GetPublicProfileByUsername(username string) (*models.User, error) {
	if m.GetPublicProfileByUsernameFunc != nil {
		return m.GetPublicProfileByUsernameFunc(username)
	}
	return nil, nil
}

func (m *MockUserService) DeleteProfile(userID uint) error {
	if m.DeleteProfileFunc != nil {
		return m.DeleteProfileFunc(userID)
	}
	return nil
}

func TestUserHandler_Register(t *testing.T) {
	mockService := &MockUserService{
		RegisterFunc: func(username string) (*models.User, error) {
			if username == "existing" {
				return nil, errors.New("this username is already taken")
			}
			return &models.User{Username: username, Role: "public_user"}, nil
		},
	}

	mockInteractionRepo := &MockInteractionRepo{}
	apiHandler := handlers.NewUserHandler(mockService, mockInteractionRepo)

	t.Run("Valid User Registration", func(t *testing.T) {
		payload := map[string]string{"username": "johndoe"}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		apiHandler.Register(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status 201 Created, got %d", w.Code)
		}
	})

	t.Run("Empty Username Rejection", func(t *testing.T) {
		payload := map[string]string{"username": ""}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		apiHandler.Register(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400 Bad Request, got %d", w.Code)
		}
	})

	t.Run("Duplicate Username Rejection", func(t *testing.T) {
		payload := map[string]string{"username": "existing"}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		apiHandler.Register(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status 400 Bad Request, got %d", w.Code)
		}
	})
}
