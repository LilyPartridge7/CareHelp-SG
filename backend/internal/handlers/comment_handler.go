package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/models"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/repositories"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
)

type CommentHandler struct {
	commentSvc  services.CommentService
	ixRepo      repositories.InteractionRepository
}

func NewCommentHandler(svc services.CommentService, ixRepo repositories.InteractionRepository) *CommentHandler {
	return &CommentHandler{
		commentSvc: svc,
		ixRepo:     ixRepo,
	}
}

func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	rawUID := r.Context().Value("user_id")
	if rawUID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "user not authenticated")
		return
	}

	var body services.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if err := utils.ValidateStruct(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	authorID := uint(rawUID.(float64))
	comment, err := h.commentSvc.CreateComment(authorID, &body)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusCreated, comment)
}

func (h *CommentHandler) GetPostComments(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	postID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id form")
		return
	}

	comments, err := h.commentSvc.GetPostComments(uint(postID))
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, comments)
}

func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	cmtID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid comment id form")
		return
	}

	rawUID := r.Context().Value("user_id")
	rawRole := r.Context().Value("user_role")

	commentID := uint(cmtID)
	authorID := uint(rawUID.(float64))
	role := rawRole.(string)

	err := h.commentSvc.DeleteComment(commentID, authorID, role)
	if err != nil {
		switch err.Error() {
		case "unauthorized to delete this comment":
			utils.RespondError(w, http.StatusForbidden, err.Error())
		case "comment not found":
			utils.RespondError(w, http.StatusNotFound, err.Error())
		default:
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "comment deleted successfully"})
}

func (h *CommentHandler) PinComment(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	cmtID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid comment id form")
		return
	}

	rawUID := r.Context().Value("user_id")
	rawRole := r.Context().Value("user_role")

	commentID := uint(cmtID)
	authorID := uint(rawUID.(float64))
	role := rawRole.(string)

	err := h.commentSvc.PinComment(commentID, authorID, role)
	if err != nil {
		switch err.Error() {
		case "unauthorized to pin this comment":
			utils.RespondError(w, http.StatusForbidden, err.Error())
		case "comment not found", "associated post not found":
			utils.RespondError(w, http.StatusNotFound, err.Error())
		default:
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "comment pinned successfully"})
}

func (h *CommentHandler) LoveComment(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	cmtID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid comment id form")
		return
	}

	if err := h.commentSvc.LoveComment(uint(cmtID)); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to love comment")
		return
	}

	if rawUID := r.Context().Value("user_id"); rawUID != nil {
		uid := uint(rawUID.(float64))
		h.ixRepo.SaveInteraction(&models.Interaction{
			UserID: uid, TargetID: uint(cmtID), TargetType: "comment", InteractionType: "love",
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "comment loved successfully"})
}

func (h *CommentHandler) UnloveComment(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	cmtID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid comment id form")
		return
	}

	if err := h.commentSvc.UnloveComment(uint(cmtID)); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to unlove comment")
		return
	}

	if rawUID := r.Context().Value("user_id"); rawUID != nil {
		uid := uint(rawUID.(float64))
		h.ixRepo.RemoveInteraction(uid, uint(cmtID), "comment", "love")
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "comment unloved successfully"})
}

type editCommentBody struct {
	Content string `json:"content"`
}

func (h *CommentHandler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	cmtID, convErr := strconv.ParseUint(idStr, 10, 32)
	if convErr != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid comment id form")
		return
	}

	rawUID := r.Context().Value("user_id")
	rawRole := r.Context().Value("user_role")

	var body editCommentBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	commentID := uint(cmtID)
	authorID := uint(rawUID.(float64))
	role := rawRole.(string)

	updated, err := h.commentSvc.UpdateComment(commentID, authorID, role, body.Content)
	if err != nil {
		switch err.Error() {
		case "unauthorized to update this comment":
			utils.RespondError(w, http.StatusForbidden, err.Error())
		case "comment not found":
			utils.RespondError(w, http.StatusNotFound, err.Error())
		default:
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	utils.RespondJSON(w, http.StatusOK, updated)
}
