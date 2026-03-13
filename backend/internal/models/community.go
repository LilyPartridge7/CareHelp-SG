package models

import (
	"time"

	"gorm.io/gorm"
)

// The Community struct defines a sub-forum where Voluteers, Beneficiaries, etc., can gather.
type Community struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Name        string         `gorm:"unique;not null;type:varchar(100)" json:"name" validate:"required,min=3"`
	Description string         `gorm:"type:text" json:"description"`
}
