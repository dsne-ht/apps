@echo off
title DSNE - Clinique Mobile
cd /d "%~dp0"
git pull --quiet
cd dsne-cm
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
