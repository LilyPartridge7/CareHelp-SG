package repositories

import (
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"gorm.io/gorm"
)

type InteractionRepository interface {
	SaveInteraction(interaction *models.Interaction) error
	RemoveInteraction(userID uint, targetID uint, targetType string, interactionType string) error
	GetUserInteractions(userID uint) ([]models.Interaction, error)
}

type interactionRepoImpl struct {
	db *gorm.DB
}

func NewInteractionRepository(db *gorm.DB) InteractionRepository {
	return &interactionRepoImpl{db: db}
}

func (r *interactionRepoImpl) SaveInteraction(interaction *models.Interaction) error {
	return r.db.Where(models.Interaction{
		UserID:          interaction.UserID,
		TargetID:        interaction.TargetID,
		TargetType:      interaction.TargetType,
		InteractionType: interaction.InteractionType,
	}).Assign(models.Interaction{EmojiData: interaction.EmojiData}).FirstOrCreate(interaction).Error
}

func (r *interactionRepoImpl) RemoveInteraction(userID uint, targetID uint, targetType string, interactionType string) error {
	return r.db.Where("user_id = ? AND target_id = ? AND target_type = ? AND interaction_type = ?", userID, targetID, targetType, interactionType).Delete(&models.Interaction{}).Error
}

func (r *interactionRepoImpl) GetUserInteractions(userID uint) ([]models.Interaction, error) {
	var interactions []models.Interaction
	err := r.db.Where("user_id = ?", userID).Find(&interactions).Error
	return interactions, err
}
