package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
)

type PostHandler struct {
	postSvc     services.PostService
	ixRepo      repositories.InteractionRepository
	notifSvc    *services.NotificationService
}

func NewPostHandler(svc services.PostService, ixRepo repositories.InteractionRepository, notifSvc *services.NotificationService) *PostHandler {
	return &PostHandler{
		postSvc:  svc,
		ixRepo:   ixRepo,
		notifSvc: notifSvc,
	}
}

func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	rawUID := r.Context().Value("user_id")
	if rawUID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	var body services.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if err := utils.ValidateStruct(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	authorID := uint(rawUID.(float64))
	post, err := h.postSvc.CreatePost(authorID, &body)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusCreated, post)
}

func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	postIDStr := r.PathValue("id")
	postIDNum, convErr := strconv.ParseUint(postIDStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	authHeader := r.Header.Get("Authorization")
	var callerID uint
	var callerRole string
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
				return []byte(os.Getenv("JWT_SECRET")), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if idFloat, ok := claims["user_id"].(float64); ok {
						callerID = uint(idFloat)
					}
					if rr, ok := claims["role"].(string); ok {
						callerRole = rr
					}
				}
			}
		}
	}

	post, err := h.postSvc.GetPost(uint(postIDNum), callerID, callerRole)
	if err != nil {
		if err.Error() == "post not found" {
			utils.RespondError(w, http.StatusNotFound, err.Error())
			return
		}
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, post)
}

func (h *PostHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.postSvc.ListPosts()
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, posts)
}

func (h *PostHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	rawUserID := r.Context().Value("user_id")
	rawUserRole := r.Context().Value("user_role")

	var updatePayload services.UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&updatePayload); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if err := utils.ValidateStruct(&updatePayload); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	postID := uint(parsedPostID)
	authorID := uint(rawUserID.(float64))
	userRole := rawUserRole.(string)

	updatedPost, serviceError := h.postSvc.UpdatePost(postID, authorID, userRole, &updatePayload)

	if serviceError != nil {
		isForbiddenError := serviceError.Error() == "unauthorized to edit this post"
		isNotFoundError := serviceError.Error() == "post not found"

		if isForbiddenError {
			utils.RespondError(w, http.StatusForbidden, serviceError.Error())
			return
		}
		if isNotFoundError {
			utils.RespondError(w, http.StatusNotFound, serviceError.Error())
			return
		}

		utils.RespondError(w, http.StatusInternalServerError, serviceError.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, updatedPost)
}

func (h *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	rawUserID := r.Context().Value("user_id")
	rawUserRole := r.Context().Value("user_role")

	postID := uint(parsedPostID)
	authorID := uint(rawUserID.(float64))
	userRole := rawUserRole.(string)

	serviceError := h.postSvc.DeletePost(postID, authorID, userRole)

	if serviceError != nil {
		isForbiddenError := serviceError.Error() == "unauthorized to delete this post"
		isNotFoundError := serviceError.Error() == "post not found"

		if isForbiddenError {
			utils.RespondError(w, http.StatusForbidden, serviceError.Error())
			return
		}
		if isNotFoundError {
			utils.RespondError(w, http.StatusNotFound, serviceError.Error())
			return
		}

		utils.RespondError(w, http.StatusInternalServerError, serviceError.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post deleted successfully"})
}

func (h *PostHandler) UpvotePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		exists, _ := h.ixRepo.CheckInteraction(uid, postID, "post", "upvote")
		if exists {
			utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "already upvoted"})
			return
		}

		serviceError := h.postSvc.UpvotePost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to upvote post")
			return
		}

		h.ixRepo.SaveInteraction(&models.Interaction{
			UserID: uid, TargetID: postID, TargetType: "post", InteractionType: "upvote",
		})
		h.ixRepo.RemoveInteraction(uid, postID, "post", "dislike")

		// Trigger notification
		post, err := h.postSvc.GetPost(postID, uid, "")
		if err == nil && post != nil && post.AuthorID != uid {
			h.notifSvc.CreateNotification(post.AuthorID, "upvote", "Someone upvoted your post", "/post/"+strconv.Itoa(int(postID)))
		}
	} else {
		serviceError := h.postSvc.UpvotePost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to upvote post")
			return
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post upvoted successfully"})
}

func (h *PostHandler) UnupvotePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	serviceError := h.postSvc.UnupvotePost(postID)

	if serviceError != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to unupvote post")
		return
	}

	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		h.ixRepo.RemoveInteraction(uid, postID, "post", "upvote")
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post unupvoted successfully"})
}

func (h *PostHandler) RestorePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	rawUserID := r.Context().Value("user_id")
	if rawUserID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rawUserRole := r.Context().Value("user_role")

	userID := uint(rawUserID.(float64))
	userRole := rawUserRole.(string)

	serviceError := h.postSvc.RestorePost(postID, userID, userRole)

	if serviceError != nil {
		utils.RespondError(w, http.StatusInternalServerError, serviceError.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post restored successfully"})
}

func (h *PostHandler) DislikePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		exists, _ := h.ixRepo.CheckInteraction(uid, postID, "post", "dislike")
		if exists {
			utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "already disliked"})
			return
		}

		serviceError := h.postSvc.DislikePost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to dislike post")
			return
		}

		h.ixRepo.SaveInteraction(&models.Interaction{
			UserID: uid, TargetID: postID, TargetType: "post", InteractionType: "dislike",
		})
		h.ixRepo.RemoveInteraction(uid, postID, "post", "upvote")
	} else {
		serviceError := h.postSvc.DislikePost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to dislike post")
			return
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post disliked successfully"})
}

func (h *PostHandler) UndislikePost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	serviceError := h.postSvc.UndislikePost(postID)

	if serviceError != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to undislike post")
		return
	}

	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		h.ixRepo.RemoveInteraction(uid, postID, "post", "dislike")
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post undisliked successfully"})
}

func (h *PostHandler) RepostPost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		exists, _ := h.ixRepo.CheckInteraction(uid, postID, "post", "repost")
		if exists {
			utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "already reposted"})
			return
		}

		serviceError := h.postSvc.RepostPost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to repost post")
			return
		}

		h.ixRepo.SaveInteraction(&models.Interaction{
			UserID: uid, TargetID: postID, TargetType: "post", InteractionType: "repost",
		})
	} else {
		serviceError := h.postSvc.RepostPost(postID)
		if serviceError != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to repost post")
			return
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post reposted successfully"})
}

func (h *PostHandler) UnrepostPost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	postID := uint(parsedPostID)
	serviceError := h.postSvc.UnrepostPost(postID)

	if serviceError != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to unrepost post")
		return
	}

	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		h.ixRepo.RemoveInteraction(uid, postID, "post", "repost")
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post unreposted successfully"})
}

type reactRequest struct {
	Emoji string `json:"emoji"`
}

func (h *PostHandler) ReactPost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	var payload reactRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	postID := uint(parsedPostID)
	serviceError := h.postSvc.ReactPost(postID, payload.Emoji)

	if serviceError != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to react to post")
		return
	}

	if rawUserID := r.Context().Value("user_id"); rawUserID != nil {
		uid := uint(rawUserID.(float64))
		if payload.Emoji == "" {
			h.ixRepo.RemoveInteraction(uid, postID, "post", "emoji")
		} else {
			h.ixRepo.SaveInteraction(&models.Interaction{
				UserID: uid, TargetID: postID, TargetType: "post", InteractionType: "emoji", EmojiData: payload.Emoji,
			})
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post reacted to successfully"})
}

func (h *PostHandler) GetArchivedPosts(w http.ResponseWriter, r *http.Request) {
	rawUserID := r.Context().Value("user_id")
	if rawUserID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}
	authorID := uint(rawUserID.(float64))

	archivedPosts, fetchError := h.postSvc.GetArchivedPosts(authorID)
	if fetchError != nil {
		utils.RespondError(w, http.StatusInternalServerError, fetchError.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, archivedPosts)
}

func (h *PostHandler) GetPostsByUsername(w http.ResponseWriter, r *http.Request) {
	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondError(w, http.StatusBadRequest, "username parameter is required")
		return
	}

	userPosts, err := h.postSvc.GetPostsByUsername(targetUsername)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to fetch user posts")
		return
	}

	utils.RespondJSON(w, http.StatusOK, userPosts)
}

func (h *PostHandler) PinPost(w http.ResponseWriter, r *http.Request) {
	postIDString := r.PathValue("id")
	parsedPostID, parseError := strconv.ParseUint(postIDString, 10, 32)
	if parseError != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	var payload services.PinPostRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondError(w, http.StatusBadRequest, "invalid request payload")
			return
		}
	}

	rawUserID := r.Context().Value("user_id")
	rawUserRole := r.Context().Value("user_role")

	postID := uint(parsedPostID)
	authorID := uint(rawUserID.(float64))
	userRole := rawUserRole.(string)

	serviceError := h.postSvc.PinPost(postID, authorID, userRole, &payload)

	if serviceError != nil {
		isForbiddenError := serviceError.Error() == "unauthorized to pin this post"
		isNotFoundError := serviceError.Error() == "post not found"

		if isForbiddenError {
			utils.RespondError(w, http.StatusForbidden, serviceError.Error())
			return
		}
		if isNotFoundError {
			utils.RespondError(w, http.StatusNotFound, serviceError.Error())
			return
		}

		utils.RespondError(w, http.StatusInternalServerError, serviceError.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "post pinned successfully"})
}
