@echo off
title DSNE - Installation des applications
cd /d "%~dp0"

echo ================================================
echo  DSNE - Installation des applications
echo  Ministere de la Sante Publique et de la Population
echo  Direction Sanitaire du Nord-Est
echo ================================================
echo.
echo Ce programme va installer les applications DSNE
echo sur cet ordinateur.
echo.
echo PREREQUIS :
echo   - Git for Windows (git-scm.com)
echo   - Node.js LTS (nodejs.org)
echo.
echo Appuyez sur une touche pour continuer...
pause > nul

:: Check Git
where git >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERREUR: Git n'est pas installe.
    echo Installez Git depuis: https://git-scm.com
    echo puis relancez ce fichier.
    pause
    exit /b 1
)

:: Check Node
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERREUR: Node.js n'est pas installe.
    echo Installez Node.js depuis: https://nodejs.org
    echo puis relancez ce fichier.
    pause
    exit /b 1
)

echo.
echo [1/3] Clonage du depot DSNE...
if exist "%USERPROFILE%\Desktop\DSNE-Apps" (
    echo Le dossier DSNE-Apps existe deja - mise a jour...
    cd /d "%USERPROFILE%\Desktop\DSNE-Apps"
    git fetch --quiet
    git reset --hard origin/master --quiet
) else (
    cd /d "%USERPROFILE%\Desktop"
    git clone https://github.com/dsne-ht/apps.git DSNE-Apps --quiet
    cd DSNE-Apps
)

echo.
echo [2/3] Installation des dependances...
for %%A in (dsne-accueil dsne-cm dsne-hyg dsne-log dsne-bureau) do (
    echo   - %%A
    cd %%A
    call npm install --quiet
    cd ..
)

echo.
echo [3/3] Creation des raccourcis sur le bureau...

:: Create shortcuts via PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $apps = @('dsne-accueil:DSNE-ACCUEIL.bat:DSNE Reception','dsne-cm:DSNE-CM.bat:DSNE Clinique Mobile','dsne-hyg:DSNE-HYG.bat:DSNE Hygiene','dsne-log:DSNE-LOG.bat:DSNE Logistique','dsne-bureau:DSNE-BUREAU.bat:Bureau de Direction'); foreach ($a in $apps) { $parts = $a.Split(':'); $batPath = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', 'DSNE-Apps', $parts[1]); $lnk = $ws.CreateShortcut([System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', $parts[2] + '.lnk')); $lnk.TargetPath = $batPath; $lnk.WorkingDirectory = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop', 'DSNE-Apps'); $lnk.Save() }"

echo.
echo ================================================
echo  Installation complete !
echo.
echo  Des raccourcis ont ete crees sur votre bureau :
echo    - DSNE Reception
echo    - DSNE Clinique Mobile
echo    - DSNE Hygiene
echo    - DSNE Logistique
echo    - Bureau de Direction
echo.
echo  A chaque lancement, l'application se met
echo  automatiquement a jour depuis GitHub.
echo ================================================
echo.
pause
