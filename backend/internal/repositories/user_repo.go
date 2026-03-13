package repositories

import (
	"errors"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"gorm.io/gorm"
)

type UserRepository interface {
	CreateUser(newUser *models.User) error
	FindByUsername(targetUsername string) (*models.User, error)
	FindByEmail(targetEmail string) (*models.User, error)
	FindByID(id uint) (*models.User, error)
	UpdateUser(user *models.User) error
	DeleteUser(userID uint) error
}

type userRepositoryImpl struct {
	databaseConnection *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepositoryImpl{
		databaseConnection: db,
	}
}

func (repo *userRepositoryImpl) CreateUser(newUser *models.User) error {
	creationResult := repo.databaseConnection.Create(newUser)
	return creationResult.Error
}

func (repo *userRepositoryImpl) FindByUsername(targetUsername string) (*models.User, error) {
	var userRecord models.User

	searchResult := repo.databaseConnection.Where("username = ?", targetUsername).First(&userRecord)

	if searchResult.Error != nil {
		if errors.Is(searchResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil // user does not exist
		}
		return nil, searchResult.Error // real db error
	}

	return &userRecord, nil
}

func (repo *userRepositoryImpl) FindByEmail(targetEmail string) (*models.User, error) {
	var userRecord models.User

	searchResult := repo.databaseConnection.Where("email = ?", targetEmail).First(&userRecord)

	if searchResult.Error != nil {
		if errors.Is(searchResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil // user does not exist
		}
		return nil, searchResult.Error // real db error
	}

	return &userRecord, nil
}

func (repo *userRepositoryImpl) FindByID(id uint) (*models.User, error) {
	var userRecord models.User
	result := repo.databaseConnection.Preload("Posts").Preload("Comments").First(&userRecord, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil // user does not exist
		}
		return nil, result.Error
	}
	return &userRecord, nil
}

func (repo *userRepositoryImpl) UpdateUser(user *models.User) error {
	result := repo.databaseConnection.Save(user)
	return result.Error
}

func (repo *userRepositoryImpl) DeleteUser(userID uint) error {
	// Execute an Unscoped delete to permanently remove the user and trigger cascading deletes
	result := repo.databaseConnection.Unscoped().Delete(&models.User{}, userID)
	return result.Error
}
