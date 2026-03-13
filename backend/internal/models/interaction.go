package models

import "gorm.io/gorm"

type Interaction struct {
	gorm.Model
	UserID          uint   `gorm:"not null;index;uniqueIndex:idx_user_target_type"`
	TargetID        uint   `gorm:"not null;index;uniqueIndex:idx_user_target_type"`                  // PostID or CommentID
	TargetType      string `gorm:"type:varchar(20);not null;index;uniqueIndex:idx_user_target_type"` // "post" or "comment"
	InteractionType string `gorm:"type:varchar(20);not null;index;uniqueIndex:idx_user_target_type"` // "upvote", "dislike", "repost", "emoji", "love"
	EmojiData       string `gorm:"type:varchar(50)"`
}
