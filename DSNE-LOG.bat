@echo off
title DSNE - Logistique
cd /d "%~dp0"
git pull --quiet
cd dsne-log
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
