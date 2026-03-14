package models

import (
	"time"
	"gorm.io/gorm"
)

type Comment struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	PostID   uint   `gorm:"not null;index" json:"post_id"`
	AuthorID uint   `gorm:"not null;index" json:"author_id"`
	Author   User   `gorm:"foreignKey:AuthorID" json:"author"` // Belongs To User
	Content  string `gorm:"not null" json:"content"`
	ParentID *uint  `gorm:"index" json:"parent_id,omitempty"`
	IsPinned         bool   `gorm:"default:false" json:"is_pinned"`
	Loves            int    `gorm:"default:0" json:"loves"`
	IsDeletedByAdmin bool   `gorm:"default:false" json:"is_deleted_by_admin"`
}
