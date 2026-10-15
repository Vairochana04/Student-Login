@echo off
cd /d "%~dp0"
title PSG Campus Compass - Java server
echo ============================================================
echo   PSG Campus Compass   ^|   16 campuses (PSG + Karpagam)
echo   Java backend   ^|   http://localhost:8090
echo ============================================================
echo.

set JAVA=
java -version >nul 2>&1
if %errorlevel% EQU 0 set JAVA=java
if defined JAVA goto havejava

echo  ------------------------------------------------------------
echo   Java kaanala (Java was not found on this PC).
echo.
echo   JDK install pannunga (once):
echo       winget install Microsoft.OpenJDK.21
echo   illa:  https://adoptium.net   -^>  "Install Temurin 21 (JDK)"
echo.
echo   Install pannina pinne indha file-a thirumba double-click pannunga.
echo  ------------------------------------------------------------
pause
exit /b 1

:havejava
javac -version >nul 2>&1
if %errorlevel% NEQ 0 (
    echo  ------------------------------------------------------------
    echo   java irukku aana javac illa - JDK venum (JRE pothathu).
    echo.
    echo       winget install Microsoft.OpenJDK.21
    echo   illa:  https://adoptium.net   -^>  "Install Temurin 21 (JDK)"
    echo  ------------------------------------------------------------
    pause
    exit /b 1
)

echo  Compiling Server.java ...
javac -encoding UTF-8 Server.java
if %errorlevel% NEQ 0 (
    echo.
    echo  Compile failed - mela irukkura error text-a copy panni anuppunga.
    pause
    exit /b 1
)

echo  Starting the Java server... browser thana open aagum.
start "" http://localhost:8090
java Server
echo.
echo  Server ninnuduchu (server stopped). Idha close pannalam.
pause
