@echo off
title DSNE - LOG
cd /d "%~dp0"
git fetch --quiet
git reset --hard origin/master --quiet
cd dsne-log
if not exist node_modules (
    echo Installation en cours...
    npm install --quiet
)
npm start
