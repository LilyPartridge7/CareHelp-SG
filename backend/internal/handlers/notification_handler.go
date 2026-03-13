package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/services"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(service *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: service}
}

func (h *NotificationHandler) GetMyNotifications(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value("user_id")
	if userIDVal == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}
	userID := uint(userIDVal.(float64))

	notifications, err := h.notificationService.GetUserNotifications(userID)
	if err != nil {
		http.Error(w, `{"error": "failed to fetch notifications"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value("user_id")
	if userIDVal == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}
	userID := uint(userIDVal.(float64))

	notifIDStr := r.PathValue("id")
	if notifIDStr == "" {
		http.Error(w, `{"error": "missing notification ID"}`, http.StatusBadRequest)
		return
	}

	notifID, err := strconv.ParseUint(notifIDStr, 10, 32)
	if err != nil {
		http.Error(w, `{"error": "invalid notification ID"}`, http.StatusBadRequest)
		return
	}

	err = h.notificationService.MarkNotificationAsRead(uint(notifID), userID)
	if err != nil {
		http.Error(w, `{"error": "failed to mark notification as read"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "success"}`))
}

func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value("user_id")
	if userIDVal == nil {
		http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
		return
	}
	userID := uint(userIDVal.(float64))

	err := h.notificationService.MarkAllNotificationsAsRead(userID)
	if err != nil {
		http.Error(w, `{"error": "failed to mark notifications as read"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "success"}`))
}
