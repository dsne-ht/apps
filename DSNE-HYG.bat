@echo off
title DSNE - Hygiene Publique
cd /d "%~dp0"
git pull --quiet
cd dsne-hyg
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
