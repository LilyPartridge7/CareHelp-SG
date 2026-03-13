package services

import (
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
)

type NotificationService struct {
	repo *repositories.NotificationRepository
}

func NewNotificationService(repo *repositories.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) CreateNotification(userID uint, notifType, message, link string) error {
	notification := &models.Notification{
		UserID:  userID,
		Type:    notifType,
		Message: message,
		Link:    link,
		IsRead:  false,
	}
	return s.repo.Create(notification)
}

func (s *NotificationService) GetUserNotifications(userID uint) ([]models.Notification, error) {
	return s.repo.GetByUserID(userID)
}

func (s *NotificationService) MarkNotificationAsRead(notificationID uint, userID uint) error {
	return s.repo.MarkAsRead(notificationID, userID)
}

func (s *NotificationService) MarkAllNotificationsAsRead(userID uint) error {
	return s.repo.MarkAllAsRead(userID)
}
