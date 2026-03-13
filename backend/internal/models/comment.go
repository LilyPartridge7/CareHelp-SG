package models

import "gorm.io/gorm"

type Comment struct {
	gorm.Model
	PostID   uint   `gorm:"not null;index" json:"post_id"`
	AuthorID uint   `gorm:"not null;index" json:"author_id"`
	Author   User   `gorm:"foreignKey:AuthorID" json:"author"` // Belongs To User
	Content  string `gorm:"not null" json:"content"`
	ParentID *uint  `gorm:"index" json:"parent_id,omitempty"`
	IsPinned         bool   `gorm:"default:false" json:"is_pinned"`
	Loves            int    `gorm:"default:0" json:"loves"`
	IsDeletedByAdmin bool   `gorm:"default:false" json:"is_deleted_by_admin"`
}
