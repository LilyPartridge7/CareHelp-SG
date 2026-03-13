@echo off
echo ==============================================
echo    CareHelp SG - Local Development Startup
echo ==============================================
echo.

echo [1/3] Starting PostgreSQL (via Docker)...
echo Note: This requires Docker Desktop to be running.
docker run --name carehelp_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=carehelp_db -p 5432:5432 -d postgres:15-alpine 2>NUL
if errorlevel 1 (
    echo Database container might already exist. Attempting to start it...
    docker start carehelp_db
)
echo.

echo [2/3] Starting Go Backend Server...
cd backend
start cmd /k "echo Starting Go Server on port 8080... && go run ./cmd/server/main.go"
cd ..
echo.

echo [3/3] Starting React Vite Frontend...
cd frontend
start cmd /k "echo Starting React Vite on port 5173... && npm run dev"
cd ..
echo.

echo ==============================================
echo All services started! 
echo - Backend API: http://localhost:8080
echo - Frontend UI: http://localhost:5173
echo ==============================================
pause
