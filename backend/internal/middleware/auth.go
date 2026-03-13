package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/LilyPartridge7/CareHelp-SG/backend/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

func RequireJWT() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				utils.RespondError(w, http.StatusUnauthorized, "authorization header is required")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.RespondError(w, http.StatusUnauthorized, "authorization header format must be Bearer {token}")
				return
			}

			tokenString := parts[1]
			secret := os.Getenv("JWT_SECRET")

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				utils.RespondError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				userID, ok := claims["user_id"].(float64)
				if !ok {
					utils.RespondError(w, http.StatusUnauthorized, "invalid token payload format")
					return
				}
				role, _ := claims["role"].(string)

				ctx := context.WithValue(r.Context(), "user_id", userID)
				ctx = context.WithValue(ctx, "user_role", role)

				next.ServeHTTP(w, r.WithContext(ctx))
			} else {
				utils.RespondError(w, http.StatusUnauthorized, "invalid claims")
			}
		})
	}
}
