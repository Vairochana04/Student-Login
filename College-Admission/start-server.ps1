# =============================================================
#  CampusConnect - Windows starter script (VS Code friendly)
#  BACKEND: JAVA ONLY (Server.java). No Python on your PC.
#  How to use:
#    1) Open this folder in VS Code  (File > Open Folder)
#    2) Terminal > New Terminal      (Ctrl + `)
#    3) Type:  powershell -ExecutionPolicy Bypass -File .\start-server.ps1
#       (or just:  .\start-server.ps1)
#    4) Browser: http://localhost:8080   (use Incognito first time)
#  Logins: student@demo.edu/student123   admin@demo.edu/admin123
# =============================================================

# --- 0) stop any OLD server still holding port 8080 -------------
# (old server = old website = "gap page" / old admin dashboard)
Write-Host ">> Stopping any old Java server..." -ForegroundColor Yellow
taskkill /F /IM java.exe 2>$null

# --- 1) make sure JDK is installed --------------------------------
# if javac is not recognised: install JDK 17 from https://adoptium.net
# then CLOSE and RE-OPEN VS Code terminal and run this script again
$javac = Get-Command javac -ErrorAction SilentlyContinue
if (-not $javac) {
    Write-Host "!! javac not found - the backend is Java, so install JDK 17:" -ForegroundColor Red
    Write-Host "!!   https://adoptium.net  (download the .msi, install, then)" -ForegroundColor Cyan
    Write-Host "!!   CLOSE and RE-OPEN the VS Code terminal and run this script again." -ForegroundColor Cyan
    exit 1
}

# --- 2) go to the Java backend folder -----------------------------
Set-Location "$PSScriptRoot\server"

# --- 3) compile the Java backend (UTF-8 safe, only recompiles changes)
Write-Host ">> Compiling Server.java ..." -ForegroundColor Yellow
javac -encoding UTF-8 Server.java
if ($LASTEXITCODE -ne 0) {
    Write-Host "!! Compile failed - copy the red error text and send it." -ForegroundColor Red
    exit 1
}

# --- 4) start the server -------------------------------------------
Write-Host ">> Starting Java server on http://localhost:8080 ..." -ForegroundColor Green
Write-Host ">> Logins: student@demo.edu/student123  admin@demo.edu/admin123" -ForegroundColor Cyan
java -Dfile.encoding=UTF-8 Server

# --- 5) to stop the server: press Ctrl+C in this terminal ----------
