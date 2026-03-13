package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

type UserHandler struct {
	userSvc     services.UserService
	ixRepo      repositories.InteractionRepository
}

func NewUserHandler(svc services.UserService, ixRepo repositories.InteractionRepository) *UserHandler {
	return &UserHandler{
		userSvc: svc,
		ixRepo:  ixRepo,
	}
}

func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body services.RegisterUserRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := utils.ValidateStruct(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	newUser, regErr := h.userSvc.RegisterUser(&body)
	if regErr != nil {
		utils.RespondError(w, http.StatusBadRequest, regErr.Error())
		return
	}

	utils.RespondJSON(w, http.StatusCreated, newUser)
}

func (h *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body services.LoginUserRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := utils.ValidateStruct(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tokenStr, authErr := h.userSvc.LoginUser(&body)
	if authErr != nil {
		utils.RespondError(w, http.StatusUnauthorized, authErr.Error())
		return
	}

	role, roleErr := h.fetchRole(body.Username)
	if roleErr != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to get user role")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{
		"token": tokenStr,
		"role":  role,
	})
}

func (h *UserHandler) fetchRole(username string) (string, error) {
	user, err := h.userSvc.GetPublicProfileByUsername(username)
	if err != nil {
		return "", err
	}
	return user.Role, nil
}

func (h *UserHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	var body services.GoogleLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := utils.ValidateStruct(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tokenStr, authErr := h.userSvc.GoogleLoginUser(&body)
	if authErr != nil {
		utils.RespondError(w, http.StatusUnauthorized, authErr.Error())
		return
	}

	role := "public_user"

	parsed, _, parseErr := new(jwt.Parser).ParseUnverified(tokenStr, jwt.MapClaims{})
	if parseErr == nil {
		if claims, ok := parsed.Claims.(jwt.MapClaims); ok {
			if r, ok := claims["role"].(string); ok {
				role = r
			}
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{
		"token": tokenStr,
		"role":  role,
	})
}

func (h *UserHandler) CheckUsernameAvailability(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		utils.RespondError(w, http.StatusBadRequest, "username query parameter is required")
		return
	}

	available, err := h.userSvc.CheckUsernameAvailability(username)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to check username")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]bool{"available": available})
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	uidVal := r.Context().Value("user_id")
	if uidVal == nil {
		utils.RespondError(w, http.StatusUnauthorized, "missing authentication token context")
		return
	}

	uidFloat, ok := uidVal.(float64)
	if !ok {
		utils.RespondError(w, http.StatusInternalServerError, "invalid user id type in context")
		return
	}
	userID := uint(uidFloat)

	profile, err := h.userSvc.GetProfile(userID)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, err.Error())
		return
	}

	ixList, err := h.ixRepo.GetUserInteractions(userID)
	var upvoted []uint
	var disliked []uint
	var reposted []uint
	emojis := make(map[uint]string)
	var loved []uint

	if err == nil {
		for _, ix := range ixList {
			switch ix.TargetType {
			case "post":
				switch ix.InteractionType {
				case "upvote":
					upvoted = append(upvoted, ix.TargetID)
				case "dislike":
					disliked = append(disliked, ix.TargetID)
				case "repost":
					reposted = append(reposted, ix.TargetID)
				case "emoji":
					emojis[ix.TargetID] = ix.EmojiData
				}
			case "comment":
				if ix.InteractionType == "love" {
					loved = append(loved, ix.TargetID)
				}
			}
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"profile":       profile,
		"upvotedPosts":  upvoted,
		"dislikedPosts": disliked,
		"repostedPosts": reposted,
		"reactedPosts":  emojis,
		"lovedComments": loved,
	})
}

func (h *UserHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("username")
	if name == "" {
		utils.RespondError(w, http.StatusBadRequest, "username parameter is required")
		return
	}

	user, err := h.userSvc.GetPublicProfileByUsername(name)
	if err != nil {
		utils.RespondError(w, http.StatusNotFound, "user not found")
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"id":                  user.ID,
		"username":            user.Username,
		"role":                user.Role,
		"profile_picture_url": user.ProfilePictureURL,
		"created_at":          user.CreatedAt,
	})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	uidVal := r.Context().Value("user_id")
	if uidVal == nil {
		utils.RespondError(w, http.StatusUnauthorized, "missing authentication token context")
		return
	}

	uidFloat, ok := uidVal.(float64)
	if !ok {
		utils.RespondError(w, http.StatusInternalServerError, "invalid user id type in context")
		return
	}
	userID := uint(uidFloat)

	var body services.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.userSvc.UpdateProfile(userID, &body)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, updated)
}

func (h *UserHandler) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	uidVal := r.Context().Value("user_id")
	if uidVal == nil {
		utils.RespondError(w, http.StatusUnauthorized, "missing authentication token context")
		return
	}

	uidFloat, ok := uidVal.(float64)
	if !ok {
		utils.RespondError(w, http.StatusInternalServerError, "invalid user id type in context")
		return
	}
	userID := uint(uidFloat)

	if err := h.userSvc.DeleteProfile(userID); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "account deleted successfully"}`))
}
