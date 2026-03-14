package repositories

import (
	"errors"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"

	"gorm.io/gorm"
)

type CommunityRepository interface {
	FetchAll() ([]models.Community, error)
	FetchByID(communityID uint) (*models.Community, error)
	CreateNew(newCommunity *models.Community) error
	AddUserToCommunity(userID uint, communityID uint) error
	FetchUserCommunities(userID uint) ([]models.Community, error)
	UpdateCommunity(community *models.Community) error
	DeleteCommunity(communityID uint) error
}

type databaseCommunityRepo struct {
	dbConnection *gorm.DB
}

func NewCommunityRepository(dbInstance *gorm.DB) CommunityRepository {
	return &databaseCommunityRepo{dbConnection: dbInstance}
}

func (repo *databaseCommunityRepo) FetchAll() ([]models.Community, error) {
	var communityList []models.Community
	operationResult := repo.dbConnection.Find(&communityList)
	if operationResult.Error != nil {
		return nil, operationResult.Error
	}
	return communityList, nil
}

func (repo *databaseCommunityRepo) FetchByID(communityID uint) (*models.Community, error) {
	var targetCommunity models.Community
	operationResult := repo.dbConnection.First(&targetCommunity, communityID)

	if operationResult.Error != nil {
		if errors.Is(operationResult.Error, gorm.ErrRecordNotFound) {
			return nil, nil // Mentor requirement: distinguish not found from actual db error
		}
		return nil, operationResult.Error
	}

	return &targetCommunity, nil
}

func (repo *databaseCommunityRepo) CreateNew(newCommunity *models.Community) error {
	operationResult := repo.dbConnection.Create(newCommunity)
	return operationResult.Error
}

func (repo *databaseCommunityRepo) AddUserToCommunity(userID uint, communityID uint) error {
	user := models.User{ID: userID}
	community := models.Community{ID: communityID}

	// Complex Real-World Subscriptions: Append the community to the user's Join Table relationship!
	return repo.dbConnection.Model(&user).Association("Communities").Append(&community)
}

func (repo *databaseCommunityRepo) FetchUserCommunities(userID uint) ([]models.Community, error) {
	var user models.User
	// Preload the specific joined communities using GORM
	result := repo.dbConnection.Preload("Communities").First(&user, userID)
	if result.Error != nil {
		return nil, result.Error
	}
	return user.Communities, nil
}

func (repo *databaseCommunityRepo) UpdateCommunity(community *models.Community) error {
	operationResult := repo.dbConnection.Save(community)
	return operationResult.Error
}

func (repo *databaseCommunityRepo) DeleteCommunity(communityID uint) error {
	operationResult := repo.dbConnection.Delete(&models.Community{}, communityID)
	return operationResult.Error
}
