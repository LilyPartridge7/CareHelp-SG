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

type MockInteractionRepo struct{}

func (m *MockInteractionRepo) SaveInteraction(interaction *models.Interaction) error {
	return nil
}
func (m *MockInteractionRepo) RemoveInteraction(userID uint, targetID uint, targetType string, interactionType string) error {
	return nil
}
func (m *MockInteractionRepo) GetUserInteractions(userID uint) ([]models.Interaction, error) {
	return nil, nil
}

// MockPostService implements services.PostService strictly for testing
type MockPostService struct {
	CreatePostFunc         func(authorID uint, req *services.CreatePostRequest) (*models.Post, error)
	GetPostFunc            func(id uint, reqID uint, role string) (*models.Post, error)
	ListPostsFunc          func() ([]models.Post, error)
	UpdatePostFunc         func(id, authorID uint, role string, req *services.UpdatePostRequest) (*models.Post, error)
	DeletePostFunc         func(id, authorID uint, role string) error
	RestorePostFunc        func(id uint, reqID uint, role string) error
	UpvotePostFunc         func(targetPostID uint) error
	UnupvotePostFunc       func(targetPostID uint) error
	DislikePostFunc        func(targetPostID uint) error
	UndislikePostFunc      func(targetPostID uint) error
	RepostPostFunc         func(targetPostID uint) error
	UnrepostPostFunc       func(id uint) error
	ReactPostFunc          func(id uint, emoji string) error
	GetArchivedPostsFunc   func(userID uint) ([]models.Post, error)
	GetPostsByUsernameFunc func(username string) ([]models.Post, error)
	PinPostFunc            func(id uint, reqID uint, role string, payload *services.PinPostRequest) error
}

func (m *MockPostService) CreatePost(authorID uint, requestPayload *services.CreatePostRequest) (*models.Post, error) {
	if m.CreatePostFunc != nil {
		return m.CreatePostFunc(authorID, requestPayload)
	}
	return nil, nil
}

func (m *MockPostService) GetPost(targetPostID uint, requesterID uint, requesterRole string) (*models.Post, error) {
	if m.GetPostFunc != nil {
		return m.GetPostFunc(targetPostID, requesterID, requesterRole)
	}
	return nil, nil
}

func (m *MockPostService) ListPosts() ([]models.Post, error) {
	if m.ListPostsFunc != nil {
		return m.ListPostsFunc()
	}
	return nil, nil
}

func (m *MockPostService) UpdatePost(targetPostID uint, requesterID uint, requesterRole string, updatePayload *services.UpdatePostRequest) (*models.Post, error) {
	if m.UpdatePostFunc != nil {
		return m.UpdatePostFunc(targetPostID, requesterID, requesterRole, updatePayload)
	}
	return nil, nil
}

func (m *MockPostService) DeletePost(targetPostID uint, requesterID uint, requesterRole string) error {
	if m.DeletePostFunc != nil {
		return m.DeletePostFunc(targetPostID, requesterID, requesterRole)
	}
	return nil
}

func (m *MockPostService) RestorePost(targetPostID uint, requesterID uint, requesterRole string) error {
	if m.RestorePostFunc != nil {
		return m.RestorePostFunc(targetPostID, requesterID, requesterRole)
	}
	return nil
}

func (m *MockPostService) UpvotePost(targetPostID uint) error {
	return m.UpvotePostFunc(targetPostID)
}

func (m *MockPostService) UnupvotePost(targetPostID uint) error {
	return m.UnupvotePostFunc(targetPostID)
}

func (m *MockPostService) DislikePost(targetPostID uint) error {
	return m.DislikePostFunc(targetPostID)
}

func (m *MockPostService) UndislikePost(targetPostID uint) error {
	return m.UndislikePostFunc(targetPostID)
}

func (m *MockPostService) RepostPost(targetPostID uint) error {
	if m.RepostPostFunc != nil {
		return m.RepostPostFunc(targetPostID)
	}
	return nil
}

func (m *MockPostService) UnrepostPost(targetPostID uint) error {
	if m.UnrepostPostFunc != nil {
		return m.UnrepostPostFunc(targetPostID)
	}
	return nil
}

func (m *MockPostService) ReactPost(targetPostID uint, emoji string) error {
	if m.ReactPostFunc != nil {
		return m.ReactPostFunc(targetPostID, emoji)
	}
	return nil
}

func (m *MockPostService) GetArchivedPosts(userID uint) ([]models.Post, error) {
	if m.GetArchivedPostsFunc != nil {
		return m.GetArchivedPostsFunc(userID)
	}
	return nil, nil
}

func (m *MockPostService) GetPostsByUsername(username string) ([]models.Post, error) {
	if m.GetPostsByUsernameFunc != nil {
		return m.GetPostsByUsernameFunc(username)
	}
	return nil, nil
}

func (m *MockPostService) PinPost(targetPostID uint, requesterID uint, requesterRole string, payload *services.PinPostRequest) error {
	if m.PinPostFunc != nil {
		return m.PinPostFunc(targetPostID, requesterID, requesterRole, payload)
	}
	return nil
}

func TestPostHandler_FacebookFeatures(t *testing.T) {
	mockService := &MockPostService{
		DislikePostFunc: func(id uint) error {
			if id == 99 {
				return errors.New("post not found")
			}
			return nil
		},
		RepostPostFunc: func(id uint) error {
			if id == 99 {
				return errors.New("post not found")
			}
			return nil
		},
		ReactPostFunc: func(id uint, emoji string) error {
			if id == 99 {
				return errors.New("post not found")
			}
			return nil
		},
	}

	mockInteractionRepo := &MockInteractionRepo{}
	apiHandler := handlers.NewPostHandler(mockService, mockInteractionRepo, nil)

	t.Run("Dislike Post Success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/posts/1/dislike", nil)
		req.SetPathValue("id", "1")
		w := httptest.NewRecorder()

		apiHandler.DislikePost(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 OK, got %d", w.Code)
		}
	})

	t.Run("Repost Post Success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/posts/2/repost", nil)
		req.SetPathValue("id", "2")
		w := httptest.NewRecorder()

		apiHandler.RepostPost(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 OK, got %d", w.Code)
		}
	})

	t.Run("React Post Success", func(t *testing.T) {
		payload := map[string]string{"emoji": "👍"}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/api/posts/3/react", bytes.NewBuffer(body))
		req.SetPathValue("id", "3")
		w := httptest.NewRecorder()

		apiHandler.ReactPost(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200 OK, got %d", w.Code)
		}
	})
}
