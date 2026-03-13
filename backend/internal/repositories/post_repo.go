package repositories

import (
	"errors"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"gorm.io/gorm"
)

type PostRepository interface {
	CreatePost(newPost *models.Post) error
	GetPostByID(targetPostID uint) (*models.Post, error)
	GetAllPosts() ([]models.Post, error)
	UpdatePost(updatedPost *models.Post) error
	DeletePost(postToDelete *models.Post) error
	IncrementUpvotes(targetPostID uint) error
	DecrementUpvotes(targetPostID uint) error
	IncrementDislikes(targetPostID uint) error
	DecrementDislikes(targetPostID uint) error
	IncrementReposts(targetPostID uint) error
	DecrementReposts(targetPostID uint) error
	UpdateEmoji(targetPostID uint, emoji string) error
	GetArchivedPostsByUserID(userID uint) ([]models.Post, error)
	GetPostsByUsername(username string) ([]models.Post, error)
	GetArchivedPostByID(postID uint) (*models.Post, error)
	RestorePost(postToRestore *models.Post) error
	PinPost(targetPostID uint, targetCommunityID *uint) error
	GetRoleByUserID(userID uint) (string, error)
}

type postRepositoryImpl struct {
	databaseConnection *gorm.DB
}

func NewPostRepository(db *gorm.DB) PostRepository {
	return &postRepositoryImpl{
		databaseConnection: db,
	}
}

func (repo *postRepositoryImpl) CreatePost(newPost *models.Post) error {
	creationResult := repo.databaseConnection.Create(newPost)
	return creationResult.Error
}

func (repo *postRepositoryImpl) GetPostByID(targetPostID uint) (*models.Post, error) {
	var fetchedPost models.Post

	fetchResult := repo.databaseConnection.Unscoped().Preload("Author").Preload("Community").First(&fetchedPost, targetPostID)

	if fetchResult.Error != nil {
		if errors.Is(fetchResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fetchResult.Error
	}

	return &fetchedPost, nil
}

func (repo *postRepositoryImpl) GetAllPosts() ([]models.Post, error) {
	var allPosts []models.Post

	fetchResult := repo.databaseConnection.Unscoped().
		Preload("Author").Preload("Community").
		Where("deleted_at IS NULL OR is_deleted_by_admin = ?", true).
		Order("is_pinned desc, created_at desc").
		Find(&allPosts)

	return allPosts, fetchResult.Error
}

func (repo *postRepositoryImpl) UpdatePost(updatedPost *models.Post) error {
	updateResult := repo.databaseConnection.Save(updatedPost)
	return updateResult.Error
}

func (repo *postRepositoryImpl) IncrementUpvotes(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("upvotes", gorm.Expr("upvotes + ?", 1)).Error
}

func (repo *postRepositoryImpl) DecrementUpvotes(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("upvotes", gorm.Expr("GREATEST(0, upvotes - 1)")).Error
}

func (repo *postRepositoryImpl) IncrementDislikes(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("dislikes", gorm.Expr("dislikes + ?", 1)).Error
}

func (repo *postRepositoryImpl) DecrementDislikes(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("dislikes", gorm.Expr("GREATEST(0, dislikes - 1)")).Error
}

func (repo *postRepositoryImpl) IncrementReposts(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("repost_count", gorm.Expr("repost_count + ?", 1)).Error
}

func (repo *postRepositoryImpl) DecrementReposts(targetPostID uint) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("repost_count", gorm.Expr("repost_count - ?", 1)).Error
}

func (repo *postRepositoryImpl) UpdateEmoji(targetPostID uint, emoji string) error {
	return repo.databaseConnection.Model(&models.Post{}).Where("id = ?", targetPostID).Update("emoji", emoji).Error
}

func (repo *postRepositoryImpl) DeletePost(postToDelete *models.Post) error {
	deletionResult := repo.databaseConnection.Delete(postToDelete)
	return deletionResult.Error
}

func (repo *postRepositoryImpl) RestorePost(postToRestore *models.Post) error {
	// Unscoped allows us to find and modify soft-deleted records.
	// Updating deleted_at to NULL restores the record.
	restoreResult := repo.databaseConnection.Unscoped().Model(postToRestore).Update("deleted_at", nil)
	return restoreResult.Error
}

func (repo *postRepositoryImpl) GetArchivedPostByID(postID uint) (*models.Post, error) {
	var fetchedPost models.Post
	fetchResult := repo.databaseConnection.Unscoped().Preload("Author").Preload("Community").Where("id = ? AND deleted_at IS NOT NULL", postID).First(&fetchedPost)

	if fetchResult.Error != nil {
		if errors.Is(fetchResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil // Not found
		}
		return nil, fetchResult.Error
	}

	return &fetchedPost, nil
}

func (repo *postRepositoryImpl) GetArchivedPostsByUserID(userID uint) ([]models.Post, error) {
	var archivedPosts []models.Post
	fetchResult := repo.databaseConnection.Unscoped().
		Preload("Author").Preload("Community").
		Where("author_id = ? AND deleted_at IS NOT NULL", userID).
		Order("deleted_at desc").
		Find(&archivedPosts)

	return archivedPosts, fetchResult.Error
}

func (repo *postRepositoryImpl) GetPostsByUsername(username string) ([]models.Post, error) {
	var userPosts []models.Post
	fetchResult := repo.databaseConnection.Unscoped().
		Preload("Author").Preload("Community").
		Joins("JOIN users ON users.id = posts.author_id").
		Where("users.username = ? AND (posts.deleted_at IS NULL OR posts.is_deleted_by_admin = ?)", username, true).
		Order("posts.is_pinned desc, posts.created_at desc").
		Find(&userPosts)

	return userPosts, fetchResult.Error
}

func (repo *postRepositoryImpl) PinPost(targetPostID uint, targetCommunityID *uint) error {
	var post models.Post
	if err := repo.databaseConnection.First(&post, targetPostID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{}

	if targetCommunityID != nil {
		// If a staff is explicitly pinning to a community, force it to pinned and move it
		updates["is_pinned"] = true
		updates["community_id"] = *targetCommunityID
	} else {
		// Normal toggle behavior for users
		updates["is_pinned"] = !post.IsPinned
	}

	return repo.databaseConnection.Model(&post).Updates(updates).Error
}

func (repo *postRepositoryImpl) GetRoleByUserID(userID uint) (string, error) {
	var role string
	err := repo.databaseConnection.Table("users").Select("role").Where("id = ?", userID).Scan(&role).Error
	return role, err
}
