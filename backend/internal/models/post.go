package models

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	Title            string    `gorm:"not null" json:"title"`
	Content          string    `gorm:"not null" json:"content"`
	AuthorID         uint      `gorm:"not null;index" json:"author_id"`
	Author           User      `gorm:"foreignKey:AuthorID" json:"author"` // Belongs To User
	CommunityID      uint      `gorm:"not null;index" json:"community_id"`
	Community        Community `gorm:"foreignKey:CommunityID" json:"community"` // Belongs To Community
	ImageURL         string    `gorm:"type:varchar(255)" json:"image_url"`
	Upvotes          int       `gorm:"default:0" json:"upvotes"`
	Dislikes         int       `gorm:"default:0" json:"dislikes"`
	Emoji            string    `gorm:"type:varchar(50)" json:"emoji"`
	RepostCount      int       `gorm:"default:0" json:"repost_count"`
	IsPinned         bool      `gorm:"default:false" json:"is_pinned"`
	IsDeletedByAdmin bool      `gorm:"default:false" json:"is_deleted_by_admin"`
}
