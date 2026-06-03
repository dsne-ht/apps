@echo off
title DSNE - Bureau
cd /d "%~dp0"
git pull --quiet
cd dsne-bureau
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
