#!/usr/bin/env bash
# PSG Campus Compass — Java backend (macOS / Linux)
cd "$(dirname "$0")" || exit 1

if ! command -v java >/dev/null 2>&1 || ! command -v javac >/dev/null 2>&1; then
  echo "JDK kaanala (java / javac). JDK 17 illa 21 install pannunga:"
  echo "   macOS  :  brew install openjdk@21"
  echo "   Ubuntu :  sudo apt install openjdk-21-jdk"
  echo "   illa   :  https://adoptium.net  ->  Temurin 21 (JDK)"
  read -r -p "Enter pannunga close panna... " _
  exit 1
fi

echo "============================================================"
echo "  PSG Campus Compass   |   16 campuses (PSG + Karpagam)"
echo "  Java backend   |   http://localhost:8090"
echo "============================================================"

echo "Compiling Server.java ..."
javac -encoding UTF-8 Server.java || { echo "Compile failed — mela irukkura error text-a anuppunga."; read -r -p "Enter pannunga... " _; exit 1; }

(sleep 3; open http://localhost:8090 2>/dev/null || xdg-open http://localhost:8090 2>/dev/null || true) &
java Server
