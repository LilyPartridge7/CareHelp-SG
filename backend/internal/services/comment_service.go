package services

import (
	"errors"
	"fmt"

	"regexp"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
)

type CreateCommentRequest struct {
	PostID   uint   `json:"post_id" validate:"required"`
	Content  string `json:"content" validate:"required,min=2"`
	ParentID *uint  `json:"parent_id,omitempty"`
}

type CommentService interface {
	CreateComment(authorID uint, requestPayload *CreateCommentRequest) (*models.Comment, error)
	GetPostComments(targetPostID uint) ([]models.Comment, error)
	DeleteComment(targetCommentID uint, requesterID uint, requesterRole string) error
	PinComment(targetCommentID uint, requesterID uint, requesterRole string) error
	LoveComment(targetCommentID uint) error
	UnloveComment(targetCommentID uint) error
	UpdateComment(targetCommentID uint, requesterID uint, requesterRole string, newContent string) (*models.Comment, error)
}

type commentServiceImpl struct {
	commentRepository   repositories.CommentRepository
	userRepository      repositories.UserRepository
	postRepository      repositories.PostRepository
	notificationService *NotificationService
}

func NewCommentService(repo repositories.CommentRepository, userRepo repositories.UserRepository, postRepo repositories.PostRepository, notifService *NotificationService) CommentService {
	return &commentServiceImpl{
		commentRepository:   repo,
		userRepository:      userRepo,
		postRepository:      postRepo,
		notificationService: notifService,
	}
}

func (service *commentServiceImpl) CreateComment(authorID uint, requestPayload *CreateCommentRequest) (*models.Comment, error) {
	newCommentRecord := &models.Comment{
		PostID:   requestPayload.PostID,
		AuthorID: authorID,
		Content:  requestPayload.Content,
		ParentID: requestPayload.ParentID,
	}

	creationError := service.commentRepository.CreateComment(newCommentRecord)
	if creationError != nil {
		return nil, errors.New("could not create comment")
	}

	// Trigger Notifications
	if post, err := service.postRepository.GetPostByID(requestPayload.PostID); err == nil && post != nil {
		if post.AuthorID != authorID {
			service.notificationService.CreateNotification(post.AuthorID, "comment", "Someone commented on your discussion", fmt.Sprintf("/post/%d", post.ID))
		}
	}

	// Notify users tagged in the content
	service.alertTaggedAccounts(requestPayload.Content, requestPayload.PostID, "mention")

	return newCommentRecord, nil
}

func (service *commentServiceImpl) GetPostComments(targetPostID uint) ([]models.Comment, error) {
	return service.commentRepository.GetCommentsByPostID(targetPostID)
}

func (service *commentServiceImpl) DeleteComment(targetCommentID uint, requesterID uint, requesterRole string) error {
	existingComment, fetchError := service.commentRepository.GetCommentByID(targetCommentID)

	if fetchError != nil {
		return errors.New("database error")
	}
	if existingComment == nil {
		return errors.New("comment not found")
	}

	isCommentOwner := existingComment.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isCommentOwner && !isAdminRule {
		return errors.New("unauthorized to delete this comment")
	}

	if isAdminRule && !isCommentOwner {
		existingComment.IsDeletedByAdmin = true
		service.commentRepository.UpdateComment(existingComment)
	}

	deletionError := service.commentRepository.DeleteComment(existingComment)
	return deletionError
}

func (service *commentServiceImpl) PinComment(targetCommentID uint, requesterID uint, requesterRole string) error {
	existingComment, fetchError := service.commentRepository.GetCommentByID(targetCommentID)

	if fetchError != nil {
		return errors.New("database error")
	}
	if existingComment == nil {
		return errors.New("comment not found")
	}

	post, postFetchError := service.postRepository.GetPostByID(existingComment.PostID)
	if postFetchError != nil || post == nil {
		return errors.New("associated post not found")
	}

	isPostOwner := post.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isPostOwner && !isAdminRule {
		return errors.New("unauthorized to pin this comment")
	}

	return service.commentRepository.PinComment(targetCommentID)
}

func (service *commentServiceImpl) LoveComment(targetCommentID uint) error {
	return service.commentRepository.IncrementLoves(targetCommentID)
}

func (service *commentServiceImpl) UnloveComment(targetCommentID uint) error {
	return service.commentRepository.DecrementLoves(targetCommentID)
}

func (service *commentServiceImpl) UpdateComment(targetCommentID uint, requesterID uint, requesterRole string, newContent string) (*models.Comment, error) {
	existingComment, fetchError := service.commentRepository.GetCommentByID(targetCommentID)
	if fetchError != nil {
		return nil, errors.New("database error")
	}
	if existingComment == nil {
		return nil, errors.New("comment not found")
	}

	isCommentOwner := existingComment.AuthorID == requesterID
	isAdminRule := requesterRole == "vwo_volunteer"

	if !isCommentOwner && !isAdminRule {
		return nil, errors.New("unauthorized to update this comment")
	}

	existingComment.Content = newContent
	updateError := service.commentRepository.UpdateComment(existingComment)
	if updateError != nil {
		return nil, errors.New("could not update comment")
	}

	return existingComment, nil
}

func (service *commentServiceImpl) alertTaggedAccounts(textBody string, referenceID uint, alertType string) {
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
				service.notificationService.CreateNotification(acc.ID, alertType, "You were mentioned in a comment", fmt.Sprintf("/post/%d", referenceID))
			}
		}
	}
}
