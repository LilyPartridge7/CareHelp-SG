package repositories

import (
	"errors"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"gorm.io/gorm"
)

type CommentRepository interface {
	CreateComment(newComment *models.Comment) error
	GetCommentByID(targetCommentID uint) (*models.Comment, error)
	GetCommentsByPostID(parentPostID uint) ([]models.Comment, error)
	DeleteComment(commentToDelete *models.Comment) error
	PinComment(targetCommentID uint) error
	UpdateComment(updatedComment *models.Comment) error
	IncrementLoves(targetCommentID uint) error
	DecrementLoves(targetCommentID uint) error
}

type commentRepositoryImpl struct {
	databaseConnection *gorm.DB
}

func NewCommentRepository(db *gorm.DB) CommentRepository {
	return &commentRepositoryImpl{
		databaseConnection: db,
	}
}

func (repo *commentRepositoryImpl) CreateComment(newComment *models.Comment) error {
	creationResult := repo.databaseConnection.Create(newComment)
	return creationResult.Error
}

func (repo *commentRepositoryImpl) GetCommentByID(targetCommentID uint) (*models.Comment, error) {
	var fetchedComment models.Comment

	fetchResult := repo.databaseConnection.Preload("Author").First(&fetchedComment, targetCommentID)

	if fetchResult.Error != nil {
		if errors.Is(fetchResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fetchResult.Error
	}

	return &fetchedComment, nil
}

func (repo *commentRepositoryImpl) GetCommentsByPostID(parentPostID uint) ([]models.Comment, error) {
	var retrievedComments []models.Comment

	fetchQuery := repo.databaseConnection.Unscoped().
		Preload("Author").
		Where("post_id = ? AND (deleted_at IS NULL OR is_deleted_by_admin = ?)", parentPostID, true).
		Order("created_at asc")
	fetchResult := fetchQuery.Find(&retrievedComments)

	return retrievedComments, fetchResult.Error
}

func (repo *commentRepositoryImpl) DeleteComment(commentToDelete *models.Comment) error {
	deletionResult := repo.databaseConnection.Delete(commentToDelete)
	return deletionResult.Error
}

func (repo *commentRepositoryImpl) PinComment(targetCommentID uint) error {
	return repo.databaseConnection.Model(&models.Comment{}).Where("id = ?", targetCommentID).Update("is_pinned", gorm.Expr("NOT is_pinned")).Error
}

func (repo *commentRepositoryImpl) IncrementLoves(targetCommentID uint) error {
	return repo.databaseConnection.Model(&models.Comment{}).Where("id = ?", targetCommentID).Update("loves", gorm.Expr("loves + ?", 1)).Error
}

func (repo *commentRepositoryImpl) DecrementLoves(targetCommentID uint) error {
	return repo.databaseConnection.Model(&models.Comment{}).Where("id = ?", targetCommentID).Update("loves", gorm.Expr("GREATEST(0, loves - 1)")).Error
}

func (repo *commentRepositoryImpl) UpdateComment(updatedComment *models.Comment) error {
	return repo.databaseConnection.Save(updatedComment).Error
}
