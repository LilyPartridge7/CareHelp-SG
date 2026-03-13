package services

import (
	"errors"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
)

type CommunityService interface {
	GetAllCommunities() ([]models.Community, error)
	GetCommunityInfo(communityID uint) (*models.Community, error)
	CreateCommunity(name string, description string) (*models.Community, error)
	SubscribeUser(userID uint, communityID uint) error
	GetUserSubscriptions(userID uint) ([]models.Community, error)
	UpdateCommunity(communityID uint, userRole string, name string, description string) (*models.Community, error)
	DeleteCommunity(communityID uint, userRole string) error
}

type communityServiceLogic struct {
	dataAccess repositories.CommunityRepository
}

func NewCommunityService(repoInstance repositories.CommunityRepository) CommunityService {
	return &communityServiceLogic{dataAccess: repoInstance}
}

func (srv *communityServiceLogic) GetAllCommunities() ([]models.Community, error) {
	return srv.dataAccess.FetchAll()
}

func (srv *communityServiceLogic) GetCommunityInfo(communityID uint) (*models.Community, error) {
	foundCommunity, fetchErr := srv.dataAccess.FetchByID(communityID)
	if fetchErr != nil {
		return nil, fetchErr
	}
	if foundCommunity == nil {
		return nil, errors.New("community not found")
	}
	return foundCommunity, nil
}

func (srv *communityServiceLogic) CreateCommunity(name string, description string) (*models.Community, error) {
	if len(name) < 3 {
		return nil, errors.New("community name must be at least 3 characters")
	}

	newCommunity := &models.Community{
		Name:        name,
		Description: description,
	}

	creationErr := srv.dataAccess.CreateNew(newCommunity)
	if creationErr != nil {
		return nil, creationErr
	}

	return newCommunity, nil
}

func (srv *communityServiceLogic) SubscribeUser(userID uint, communityID uint) error {
	// Let's verify the community actually exists first
	_, err := srv.GetCommunityInfo(communityID)
	if err != nil {
		return err
	}
	return srv.dataAccess.AddUserToCommunity(userID, communityID)
}

func (srv *communityServiceLogic) GetUserSubscriptions(userID uint) ([]models.Community, error) {
	return srv.dataAccess.FetchUserCommunities(userID)
}

func (srv *communityServiceLogic) UpdateCommunity(communityID uint, userRole string, name string, description string) (*models.Community, error) {
	if userRole != "vwo_volunteer" {
		return nil, errors.New("only staff can edit communities")
	}
	if len(name) < 3 {
		return nil, errors.New("community name must be at least 3 characters")
	}

	foundCommunity, err := srv.GetCommunityInfo(communityID)
	if err != nil {
		return nil, err
	}

	foundCommunity.Name = name
	foundCommunity.Description = description

	err = srv.dataAccess.UpdateCommunity(foundCommunity)
	if err != nil {
		return nil, err
	}
	return foundCommunity, nil
}

func (srv *communityServiceLogic) DeleteCommunity(communityID uint, userRole string) error {
	if userRole != "vwo_volunteer" {
		return errors.New("only staff can delete communities")
	}

	_, err := srv.GetCommunityInfo(communityID)
	if err != nil {
		return err
	}

	return srv.dataAccess.DeleteCommunity(communityID)
}
