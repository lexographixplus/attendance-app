@echo off
echo Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed.
    pause
    exit /b %errorlevel%
)

echo Copying API files...
if not exist "dist\api" mkdir "dist\api"
copy "api\index.php" "dist\api" >nul
if exist "api\config.php" copy "api\config.php" "dist\api" >nul
if exist "api\config.example.php" copy "api\config.example.php" "dist\api" >nul

echo.
echo =======================================================
echo Deployment build ready in 'dist' folder.
echo You can upload the contents of 'dist' to your web server.
echo Make sure your server supports PHP and points to 'dist'.
echo =======================================================
pause
