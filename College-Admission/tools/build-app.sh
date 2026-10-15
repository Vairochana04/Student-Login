#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# CampusConnect — build the React app (app/ -> app/dist)
#
# The repo carries app/node_modules with WINDOWS binaries (@esbuild/win32-x64,
# @rollup/rollup-win32-*), so on Linux / macOS `npm run build` fails with
# "Cannot find module @rollup/rollup-linux-x64-gnu" (or esbuild's equivalent).
# This script drops in the platform binaries the machine needs, then builds.
#
#   ./tools/build-app.sh            # plain build
#   ./tools/build-app.sh --fresh    # rm -rf node_modules && npm install first
#
# Windows users: just `cd app && npm run build` — nothing to fix there.
# ---------------------------------------------------------------------------
set -euo pipefail

APP="$(cd "$(dirname "$0")/.." && pwd)/app"
cd "$APP"

if [ "${1:-}" = "--fresh" ]; then
  echo "== fresh install =="
  rm -rf node_modules
  npm install
fi

[ -d node_modules ] || { echo "no node_modules — run: ./tools/build-app.sh --fresh" >&2; exit 1; }

ROLLUP_VER="$(node -p "require('./node_modules/rollup/package.json').version" 2>/dev/null || true)"
ESBUILD_VER="$(node -p "require('./node_modules/esbuild/package.json').version" 2>/dev/null || true)"

case "$(node -p 'process.platform + "-" + process.arch')" in
  linux-x64)   ROLLUP_PKG="@rollup/rollup-linux-x64-gnu";      ESBUILD_PKG="@esbuild/linux-x64" ;;
  linux-arm64) ROLLUP_PKG="@rollup/rollup-linux-arm64-gnu";    ESBUILD_PKG="@esbuild/linux-arm64" ;;
  darwin-x64)  ROLLUP_PKG="@rollup/rollup-darwin-x64";         ESBUILD_PKG="@esbuild/darwin-x64" ;;
  darwin-arm64)ROLLUP_PKG="@rollup/rollup-darwin-arm64";       ESBUILD_PKG="@esbuild/darwin-arm64" ;;
  *)           ROLLUP_PKG=""; ESBUILD_PKG="" ;;
esac

if [ -n "$ROLLUP_PKG" ]; then
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  for spec in "$ROLLUP_PKG@$ROLLUP_VER" "$ESBUILD_PKG@$ESBUILD_VER"; do
    NAME="${spec%@*}"
    SCOPE="node_modules/${NAME%/*}"
    DEST="$SCOPE/${NAME##*/}"
    [ -e "$DEST" ] && { echo "have $NAME"; continue; }
    echo "installing $spec"
    ( cd "$TMP" && npm pack "$spec" >/dev/null 2>&1 )
    mkdir -p "$SCOPE"
    tar xzf "$TMP"/*.tgz -C "$SCOPE"
    mv "$SCOPE/package" "$DEST"
    rm -f "$TMP"/*.tgz
  done
  chmod +x node_modules/.bin/vite 2>/dev/null || true
fi

echo "== vite build =="
node node_modules/vite/bin/vite.js build

echo
echo "done — build written to app/dist (served by server/Server.java or tools/preview_server.py)"
