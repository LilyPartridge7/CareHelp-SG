package models

import (
	"time"
)

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Type      string    `gorm:"type:varchar(50)" json:"type"` // e.g. "comment", "upvote", "mention"
	Message   string    `json:"message"`
	Link      string    `json:"link"` // e.g. "/post/12"
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
