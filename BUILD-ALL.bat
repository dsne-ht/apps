@echo off
title DSNE - Build All Installers
cd /d "%~dp0"

echo ================================================
echo  DSNE - Build all 5 app installers
echo  Output: each app's /dist folder
echo ================================================
echo.

git fetch --quiet
git reset --hard origin/master --quiet
echo [1/5] Source updated from GitHub
echo.

for %%A in (dsne-accueil dsne-cm dsne-hyg dsne-log dsne-bureau) do (
    echo Building %%A...
    cd %%A
    call npm install --quiet
    call npm run dist
    if errorlevel 1 (
        echo ERROR: %%A build failed
        pause
        exit /b 1
    )
    cd ..
    echo %%A done.
    echo.
)

echo ================================================
echo  All builds complete.
echo  Copy the .exe files from each /dist folder
echo  to your USB key.
echo.
echo  Installer locations:
echo    dsne-accueil\dist\DSNE Reception Setup*.exe
echo    dsne-cm\dist\DSNE Clinique Mobile Setup*.exe
echo    dsne-hyg\dist\DSNE Hygiene Publique Setup*.exe
echo    dsne-log\dist\DSNE Logistique Setup*.exe
echo    dsne-bureau\dist\Bureau de Direction DSNE Setup*.exe
echo ================================================
pause
