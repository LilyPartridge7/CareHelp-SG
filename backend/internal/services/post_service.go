package services

import (
	"errors"

	"fmt"
	"regexp"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
)

type CreatePostRequest struct {
	Title       string `json:"title" validate:"required,min=5"`
	Content     string `json:"content" validate:"required,min=10"`
	CommunityID uint   `json:"community_id"` // Optional from UI, defaults to general if omitted
	ImageURL    string `json:"image_url,omitempty"`
}

type UpdatePostRequest struct {
	Title   string `json:"title" validate:"omitempty,min=5"`
	Content string `json:"content" validate:"omitempty,min=10"`
}

type PinPostRequest struct {
	TargetCommunityID *uint `json:"target_community_id,omitempty"`
}

type PostService interface {
	CreatePost(authorID uint, requestPayload *CreatePostRequest) (*models.Post, error)
	GetPost(targetPostID uint, requesterID uint, requesterRole string) (*models.Post, error)
	ListPosts() ([]models.Post, error)
	UpdatePost(targetPostID uint, requesterID uint, requesterRole string, updatePayload *UpdatePostRequest) (*models.Post, error)
	DeletePost(targetPostID uint, requesterID uint, requesterRole string) error
	RestorePost(targetPostID uint, requesterID uint, requesterRole string) error
	UpvotePost(targetPostID uint) error
	UnupvotePost(targetPostID uint) error
	DislikePost(targetPostID uint) error
	UndislikePost(targetPostID uint) error
	RepostPost(targetPostID uint) error
	UnrepostPost(targetPostID uint) error
	ReactPost(targetPostID uint, emoji string) error
	GetArchivedPosts(userID uint) ([]models.Post, error)
	GetPostsByUsername(username string) ([]models.Post, error)
	PinPost(targetPostID uint, requesterID uint, requesterRole string, payload *PinPostRequest) error
}

type postServiceImpl struct {
	postRepository      repositories.PostRepository
	userRepository      repositories.UserRepository
	notificationService *NotificationService
}

func NewPostService(repo repositories.PostRepository, userRepo repositories.UserRepository, notificationService *NotificationService) PostService {
	return &postServiceImpl{
		postRepository:      repo,
		userRepository:      userRepo,
		notificationService: notificationService,
	}
}

func (service *postServiceImpl) CreatePost(authorID uint, requestPayload *CreatePostRequest) (*models.Post, error) {
	if requestPayload.CommunityID == 0 {
		requestPayload.CommunityID = 1 // Default to General Discussion ID if missing
	}

	newPostRecord := &models.Post{
		Title:       requestPayload.Title,
		Content:     requestPayload.Content,
		AuthorID:    authorID,
		CommunityID: requestPayload.CommunityID,
		ImageURL:    requestPayload.ImageURL,
	}

	creationError := service.postRepository.CreatePost(newPostRecord)
	if creationError != nil {
		return nil, errors.New("could not create post")
	}

	// Notify users tagged in the content
	service.alertTaggedAccounts(requestPayload.Content, newPostRecord.ID, "mention")

	return newPostRecord, nil
}

func (service *postServiceImpl) GetPost(targetPostID uint, requesterID uint, requesterRole string) (*models.Post, error) {
	fetchedPost, fetchError := service.postRepository.GetPostByID(targetPostID)

	if fetchError != nil {
		return nil, errors.New("database error")
	}
	if fetchedPost == nil {
		return nil, errors.New("post not found")
	}

	if fetchedPost.DeletedAt.Valid {
		if fetchedPost.AuthorID != requesterID && requesterRole != "vwo_volunteer" {
			return nil, errors.New("post not found")
		}
	}

	return fetchedPost, nil
}

func (service *postServiceImpl) ListPosts() ([]models.Post, error) {
	return service.postRepository.GetAllPosts()
}

func (service *postServiceImpl) UpdatePost(targetPostID uint, requesterID uint, requesterRole string, updatePayload *UpdatePostRequest) (*models.Post, error) {
	existingPost, fetchError := service.postRepository.GetPostByID(targetPostID)

	if fetchError != nil {
		return nil, errors.New("database error")
	}
	if existingPost == nil {
		return nil, errors.New("post not found")
	}

	isPostOwner := existingPost.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isAdminRule {
		actualRole, err := service.postRepository.GetRoleByUserID(requesterID)
		if err == nil && actualRole == "vwo_volunteer" {
			isAdminRule = true
		}
	}

	if !isPostOwner && !isAdminRule {
		return nil, errors.New("unauthorized to edit this post")
	}

	if updatePayload.Title != "" {
		existingPost.Title = updatePayload.Title
	}
	if updatePayload.Content != "" {
		existingPost.Content = updatePayload.Content
	}

	updateError := service.postRepository.UpdatePost(existingPost)
	if updateError != nil {
		return nil, errors.New("could not update post")
	}

	return existingPost, nil
}

func (service *postServiceImpl) DeletePost(targetPostID uint, requesterID uint, requesterRole string) error {
	existingPost, fetchError := service.postRepository.GetPostByID(targetPostID)

	if fetchError != nil {
		return errors.New("database error")
	}
	if existingPost == nil {
		return errors.New("post not found")
	}

	isPostOwner := existingPost.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isAdminRule {
		actualRole, err := service.postRepository.GetRoleByUserID(requesterID)
		if err == nil && actualRole == "vwo_volunteer" {
			isAdminRule = true
		}
	}

	if !isPostOwner && !isAdminRule {
		return errors.New("unauthorized to delete this post")
	}

	if isAdminRule && !isPostOwner {
		existingPost.IsDeletedByAdmin = true
		service.postRepository.UpdatePost(existingPost)
	}

	return service.postRepository.DeletePost(existingPost)
}

func (service *postServiceImpl) RestorePost(targetPostID uint, requesterID uint, requesterRole string) error {
	existingPost, fetchError := service.postRepository.GetArchivedPostByID(targetPostID)

	if fetchError != nil {
		return errors.New("database error")
	}
	if existingPost == nil {
		return errors.New("archived post not found")
	}

	isPostOwner := existingPost.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isAdminRule {
		actualRole, err := service.postRepository.GetRoleByUserID(requesterID)
		if err == nil && actualRole == "vwo_volunteer" {
			isAdminRule = true
		}
	}

	if !isPostOwner && !isAdminRule {
		return errors.New("unauthorized to restore this post")
	}

	if existingPost.IsDeletedByAdmin && !isAdminRule {
		return errors.New("this post was removed by staff and cannot be restored")
	}

	existingPost.IsDeletedByAdmin = false
	return service.postRepository.RestorePost(existingPost)
}

func (service *postServiceImpl) UpvotePost(targetPostID uint) error {
	return service.postRepository.IncrementUpvotes(targetPostID)
}

func (service *postServiceImpl) UnupvotePost(targetPostID uint) error {
	return service.postRepository.DecrementUpvotes(targetPostID)
}

func (service *postServiceImpl) DislikePost(targetPostID uint) error {
	return service.postRepository.IncrementDislikes(targetPostID)
}

func (service *postServiceImpl) UndislikePost(targetPostID uint) error {
	return service.postRepository.DecrementDislikes(targetPostID)
}

func (service *postServiceImpl) RepostPost(targetPostID uint) error {
	err := service.postRepository.IncrementReposts(targetPostID)
	if err == nil {
		if post, fetchErr := service.postRepository.GetPostByID(targetPostID); fetchErr == nil && post != nil {
			service.notificationService.CreateNotification(post.AuthorID, "repost", "Someone shared your discussion", fmt.Sprintf("/post/%d", post.ID))
		}
	}
	return err
}

func (service *postServiceImpl) UnrepostPost(targetPostID uint) error {
	return service.postRepository.DecrementReposts(targetPostID)
}

func (service *postServiceImpl) ReactPost(targetPostID uint, emoji string) error {
	return service.postRepository.UpdateEmoji(targetPostID, emoji)
}

func (service *postServiceImpl) GetArchivedPosts(userID uint) ([]models.Post, error) {
	return service.postRepository.GetArchivedPostsByUserID(userID)
}

func (service *postServiceImpl) GetPostsByUsername(username string) ([]models.Post, error) {
	return service.postRepository.GetPostsByUsername(username)
}

func (service *postServiceImpl) PinPost(targetPostID uint, requesterID uint, requesterRole string, payload *PinPostRequest) error {
	existingPost, fetchError := service.postRepository.GetPostByID(targetPostID)
	if fetchError != nil {
		return errors.New("database error")
	}
	if existingPost == nil {
		return errors.New("post not found")
	}

	isPostOwner := existingPost.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isAdminRule {
		actualRole, err := service.postRepository.GetRoleByUserID(requesterID)
		if err == nil && actualRole == "vwo_volunteer" {
			isAdminRule = true
		}
	}

	if !isPostOwner && !isAdminRule {
		return errors.New("unauthorized to pin this post")
	}

	var targetCommunity *uint
	if payload != nil && payload.TargetCommunityID != nil && isAdminRule {
		targetCommunity = payload.TargetCommunityID
	}

	return service.postRepository.PinPost(targetPostID, targetCommunity)
}

func (service *postServiceImpl) alertTaggedAccounts(textBody string, referenceID uint, alertType string) {
	tagMatcher := regexp.MustCompile(`@(\w+)`)
	matches := tagMatcher.FindAllStringSubmatch(textBody, -1)
	handled := make(map[string]bool)

	for _, match := range matches {
		if len(match) > 1 {
			accName := match[1]
			if handled[accName] {
				continue
			}
			handled[accName] = true

			acc, err := service.userRepository.FindByUsername(accName)
			if err == nil && acc != nil {
				service.notificationService.CreateNotification(acc.ID, alertType, "You were mentioned in a discussion", fmt.Sprintf("/post/%d", referenceID))
			}
		}
	}
}
