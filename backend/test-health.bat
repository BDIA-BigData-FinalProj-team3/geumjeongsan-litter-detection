@echo off
setlocal

set BACKEND_URL=%1
if "%BACKEND_URL%"=="" set BACKEND_URL=http://localhost:8080

echo Testing Backend Health Endpoints...
echo Backend URL: %BACKEND_URL%
echo.

echo === Health Check ===
curl -s %BACKEND_URL%/health
echo.
echo.

echo === Deployment Info ===
curl -s %BACKEND_URL%/deployment-info
echo.
echo.

echo === Test Complete ===
pause

