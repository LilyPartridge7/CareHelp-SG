package services

import (
	"encoding/json"
	"errors"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	RolePublic    = "public_user"
	RoleVolunteer = "vwo_volunteer"
)

type RegisterUserRequest struct {
	Username   string `json:"username" validate:"required,min=3,max=50"`
	Password   string `json:"password"`
	InviteCode string `json:"invite_code,omitempty"`
}

type LoginUserRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password"`
}

type GoogleLoginRequest struct {
	AccessToken string `json:"access_token" validate:"required"`
}

type UpdateProfileRequest struct {
	Email             string `json:"email" validate:"omitempty,email"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
}

type UserService interface {
	RegisterUser(registrationPayload *RegisterUserRequest) (*models.User, error)
	LoginUser(loginPayload *LoginUserRequest) (string, error)
	GoogleLoginUser(googlePayload *GoogleLoginRequest) (string, error)
	CheckUsernameAvailability(username string) (bool, error)
	GetProfile(userID uint) (*models.User, error)
	GetPublicProfileByUsername(username string) (*models.User, error)
	UpdateProfile(userID uint, req *UpdateProfileRequest) (*models.User, error)
	DeleteProfile(userID uint) error
}

type userServiceImpl struct {
	userRepository repositories.UserRepository
}

func NewUserService(repo repositories.UserRepository) UserService {
	return &userServiceImpl{
		userRepository: repo,
	}
}

func (service *userServiceImpl) RegisterUser(registrationPayload *RegisterUserRequest) (*models.User, error) {
	existingUserByName, _ := service.userRepository.FindByUsername(registrationPayload.Username)
	if existingUserByName != nil {
		return nil, errors.New("this username is already taken by another CareHelp member")
	}

	dummyEmail := registrationPayload.Username + "@carehelp.sg"
	existingUserByEmail, _ := service.userRepository.FindByEmail(dummyEmail)
	if existingUserByEmail != nil {
		return nil, errors.New("this username conflicts with an existing CareHelp account system")
	}

	assignedRole := RolePublic
	if registrationPayload.InviteCode == "CAREHELP_2026" {
		assignedRole = RoleVolunteer
	}

	// Hash password only if one was provided
	var hashedPassword string
	if registrationPayload.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(registrationPayload.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, errors.New("failed to encrypt password")
		}
		hashedPassword = string(hash)
	}

	newUserRecord := &models.User{
		Username:     registrationPayload.Username,
		Email:        dummyEmail,
		PasswordHash: hashedPassword,
		Role:         assignedRole,
	}

	creationError := service.userRepository.CreateUser(newUserRecord)
	if creationError != nil {
		return nil, errors.New("critical error: failed to save user to the CareHelp database")
	}

	return newUserRecord, nil
}

func (service *userServiceImpl) CheckUsernameAvailability(username string) (bool, error) {
	existingUser, _ := service.userRepository.FindByUsername(username)
	if existingUser != nil {
		return false, nil // Username is taken
	}
	return true, nil // Username is available
}

func (service *userServiceImpl) LoginUser(loginPayload *LoginUserRequest) (string, error) {
	foundUser, _ := service.userRepository.FindByUsername(loginPayload.Username)

	// Username-Only logic
	if foundUser == nil {
		return "", errors.New("invalid username, this user does not exist")
	}

	// Optional Password Check (when2meet style)
	if foundUser.PasswordHash != "" {
		// User HAS a password, so they MUST provide it and it MUST match
		if loginPayload.Password == "" {
			return "", errors.New("this account is secured with a password. Please enter it to log in")
		}

		err := bcrypt.CompareHashAndPassword([]byte(foundUser.PasswordHash), []byte(loginPayload.Password))
		if err != nil {
			return "", errors.New("invalid password")
		}
	} else {
		// User does NOT have a password.
		// If they supplied one anyway, we can optionally warn them, or just let them in.
		// For frictionless auth, we let them in.
	}

	tokenClaims := jwt.MapClaims{
		"user_id": foundUser.ID,
		"role":    foundUser.Role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	generatedToken := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)

	environmentSecret := os.Getenv("JWT_SECRET")
	if environmentSecret == "" {
		return "", errors.New("server configuration error: JWT_SECRET not found")
	}

	signedTokenString, signingError := generatedToken.SignedString([]byte(environmentSecret))

	if signingError != nil {
		return "", errors.New("could not generate token")
	}

	return signedTokenString, nil
}

// GoogleLoginUser safely fetches Google User Info via the Access Token to allow custom UI buttons
func (service *userServiceImpl) GoogleLoginUser(googlePayload *GoogleLoginRequest) (string, error) {
	// Securely fetch user info from Google's official API
	resp, err := http.Get("https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + googlePayload.AccessToken)
	if err != nil || resp.StatusCode != http.StatusOK {
		return "", errors.New("failed to verify google access token")
	}
	defer resp.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	importJSON := json.NewDecoder(resp.Body).Decode(&userInfo)
	if importJSON != nil || userInfo.Email == "" {
		return "", errors.New("invalid google user payload")
	}

	email := userInfo.Email
	name := userInfo.Name
	if name == "" {
		name = email
	}

	// Dynamic VWO Role Algorithm
	assignedRole := RolePublic

	lowerEmail := strings.ToLower(email)
	if strings.Contains(lowerEmail, "lb.org.sg") ||
		strings.Contains(lowerEmail, "carecorner.org.sg") ||
		strings.Contains(lowerEmail, "awwa.org.sg") {
		assignedRole = RoleVolunteer
	}

	// Find or Create user using Google Email
	foundUser, _ := service.userRepository.FindByEmail(email)
	if foundUser == nil {
		// Ensure unique username by appending random digits if it exists
		baseName := name
		isAvailable, _ := service.CheckUsernameAvailability(baseName)
		if !isAvailable {
			baseName = baseName + "_" + strconv.Itoa(rand.Intn(9999))
			// Just to be absolutely safe, check again
			isAvailable, _ = service.CheckUsernameAvailability(baseName)
			for !isAvailable {
				baseName = name + "_" + strconv.Itoa(rand.Intn(99999))
				isAvailable, _ = service.CheckUsernameAvailability(baseName)
			}
		}

		foundUser = &models.User{
			Username: baseName, // Use guaranteed unique name
			Email:    email,    // Save true Google email
			Role:     assignedRole,
		}
		creationError := service.userRepository.CreateUser(foundUser)
		if creationError != nil {
			return "", errors.New("failed to register google user")
		}
	} else {
		// If they already exist, upgrade their role if they newly matched a VWO domain
		if assignedRole == RoleVolunteer && foundUser.Role != RoleVolunteer {
			foundUser.Role = RoleVolunteer
			service.userRepository.CreateUser(foundUser) // Gorm acts as an upsert/save
		}
	}

	// Finally, generate our standard App JWT so the Frontend doesn't need to distinguish between Google/Local
	tokenClaims := jwt.MapClaims{
		"user_id": foundUser.ID,
		"role":    foundUser.Role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	generatedToken := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)

	environmentSecret := os.Getenv("JWT_SECRET")
	if environmentSecret == "" {
		return "", errors.New("server configuration error: JWT_SECRET not found")
	}

	signedTokenString, signingError := generatedToken.SignedString([]byte(environmentSecret))

	if signingError != nil {
		return "", errors.New("could not generate token")
	}

	return signedTokenString, nil
}

func (service *userServiceImpl) GetProfile(userID uint) (*models.User, error) {
	user, err := service.userRepository.FindByID(userID)
	if err != nil {
		return nil, errors.New("failed to retrieve profile")
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (service *userServiceImpl) GetPublicProfileByUsername(username string) (*models.User, error) {
	foundUser, err := service.userRepository.FindByUsername(username)
	if err != nil || foundUser == nil {
		return nil, errors.New("user not found")
	}

	// We return the full user record, but the handler should sanitize it
	// to ensure we only send public data (username, rep points, created_at, role, profile pic)
	return foundUser, nil
}

func (service *userServiceImpl) UpdateProfile(userID uint, req *UpdateProfileRequest) (*models.User, error) {
	user, err := service.userRepository.FindByID(userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	if req.Email != "" {
		// Check for email conflicts
		if req.Email != user.Email {
			existing, _ := service.userRepository.FindByEmail(req.Email)
			if existing != nil {
				return nil, errors.New("email already in use")
			}
			user.Email = req.Email
		}

		// VWO Domain Staff Auto-Elevation Logic
		lowerEmail := strings.ToLower(user.Email)
		if strings.Contains(lowerEmail, "lb.org.sg") ||
			strings.Contains(lowerEmail, "carecorner.org.sg") ||
			strings.Contains(lowerEmail, "awwa.org.sg") {
			user.Role = RoleVolunteer
		}
	}

	if req.ProfilePictureURL != "" {
		user.ProfilePictureURL = req.ProfilePictureURL
	}

	err = service.userRepository.UpdateUser(user)
	if err != nil {
		return nil, errors.New("failed to update profile")
	}

	return user, nil
}

func (service *userServiceImpl) DeleteProfile(userID uint) error {
	user, err := service.userRepository.FindByID(userID)
	if err != nil || user == nil {
		return errors.New("user not found")
	}

	// Because of GORM's associations, deleting the user unscoped
	// will trigger the cascades we define.
	err = service.userRepository.DeleteUser(userID)
	if err != nil {
		return errors.New("failed to delete user account")
	}

	return nil
}
