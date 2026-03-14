package models

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	Username          string `gorm:"uniqueIndex;not null" json:"username"`
	Email             string `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash      string `gorm:"type:varchar(255)" json:"-"`
	Role              string `gorm:"not null;default:'public_user'" json:"role"` // "public_user", "vwo_volunteer"
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	Skills            string `json:"skills,omitempty"`
	Availability      string `json:"availability,omitempty"`
	Organization      string `json:"organization,omitempty"`

	// Complex Many-to-Many Relationship: Users can subscribe to multiple Communities
	Communities []Community `gorm:"many2many:user_communities;" json:"communities,omitempty"`

	// Relational Activity History
	Posts    []Post    `gorm:"foreignKey:AuthorID" json:"posts,omitempty"`
	Comments []Comment `gorm:"foreignKey:AuthorID" json:"comments,omitempty"`
}
