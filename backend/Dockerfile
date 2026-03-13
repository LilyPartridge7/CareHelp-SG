# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server/main.go

# Production Runtime Image
FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /app/server .
# Copy .env only if it exists (env vars can also come from docker-compose)
COPY --from=builder /app/.en[v] ./

# Create uploads directory so media upload tool doesn't crash 
RUN mkdir -p uploads

EXPOSE 8080

CMD ["./server"]
