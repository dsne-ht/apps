@echo off
title DSNE - Accueil
cd /d "%~dp0"
git pull --quiet
cd dsne-accueil
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
