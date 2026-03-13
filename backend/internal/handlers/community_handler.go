package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
)

type CommunityHandler struct {
	logicService services.CommunityService
}

func NewCommunityHandler(serviceInstance services.CommunityService) *CommunityHandler {
	return &CommunityHandler{logicService: serviceInstance}
}

func (handler *CommunityHandler) GetList(w http.ResponseWriter, r *http.Request) {
	allCommunities, fetchErr := handler.logicService.GetAllCommunities()
	if fetchErr != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to load communities")
		return
	}

	utils.RespondJSON(w, http.StatusOK, allCommunities)
}

type createCommunityPayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (handler *CommunityHandler) Create(w http.ResponseWriter, r *http.Request) {
	var parsedBody createCommunityPayload
	if err := json.NewDecoder(r.Body).Decode(&parsedBody); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid community data provided")
		return
	}
	if len(parsedBody.Name) < 3 {
		utils.RespondError(w, http.StatusBadRequest, "name must be at least 3 characters")
		return
	}

	createdObj, serviceErr := handler.logicService.CreateCommunity(parsedBody.Name, parsedBody.Description)
	if serviceErr != nil {
		utils.RespondError(w, http.StatusInternalServerError, serviceErr.Error())
		return
	}

	utils.RespondJSON(w, http.StatusCreated, createdObj)
}

func (handler *CommunityHandler) JoinCommunity(w http.ResponseWriter, r *http.Request) {
	communityIDStr := r.PathValue("id")
	communityID, err := strconv.ParseUint(communityIDStr, 10, 32)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid community ID")
		return
	}

	rawUserID := r.Context().Value("user_id")
	if rawUserID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "Unauthorized context")
		return
	}
	userID := uint(rawUserID.(float64))

	serviceErr := handler.logicService.SubscribeUser(userID, uint(communityID))
	if serviceErr != nil {
		utils.RespondError(w, http.StatusInternalServerError, serviceErr.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "Successfully joined community"})
}

func (handler *CommunityHandler) GetUserCommunities(w http.ResponseWriter, r *http.Request) {
	rawUserID := r.Context().Value("user_id")
	if rawUserID == nil {
		utils.RespondError(w, http.StatusUnauthorized, "Unauthorized context")
		return
	}
	userID := uint(rawUserID.(float64))

	subs, err := handler.logicService.GetUserSubscriptions(userID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, subs)
}

func (handler *CommunityHandler) Update(w http.ResponseWriter, r *http.Request) {
	communityIDStr := r.PathValue("id")
	communityID, err := strconv.ParseUint(communityIDStr, 10, 32)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid community ID")
		return
	}

	rawRole := r.Context().Value("role")
	if rawRole == nil {
		utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	userRole := rawRole.(string)

	var parsedBody createCommunityPayload
	if err := json.NewDecoder(r.Body).Decode(&parsedBody); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid JSON data")
		return
	}

	updatedObj, serviceErr := handler.logicService.UpdateCommunity(uint(communityID), userRole, parsedBody.Name, parsedBody.Description)
	if serviceErr != nil {
		if serviceErr.Error() == "only staff can edit communities" {
			utils.RespondError(w, http.StatusForbidden, serviceErr.Error())
			return
		}
		utils.RespondError(w, http.StatusInternalServerError, serviceErr.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, updatedObj)
}

func (handler *CommunityHandler) Delete(w http.ResponseWriter, r *http.Request) {
	communityIDStr := r.PathValue("id")
	communityID, err := strconv.ParseUint(communityIDStr, 10, 32)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Invalid community ID")
		return
	}

	rawRole := r.Context().Value("role")
	if rawRole == nil {
		utils.RespondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	userRole := rawRole.(string)

	serviceErr := handler.logicService.DeleteCommunity(uint(communityID), userRole)
	if serviceErr != nil {
		if serviceErr.Error() == "only staff can delete communities" {
			utils.RespondError(w, http.StatusForbidden, serviceErr.Error())
			return
		}
		utils.RespondError(w, http.StatusInternalServerError, serviceErr.Error())
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]string{"message": "Community successfully deleted"})
}
