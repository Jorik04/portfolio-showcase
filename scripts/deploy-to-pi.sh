#!/usr/bin/env bash

set -euo pipefail

PI_HOST="${PI_HOST:-jorikb@ssh.jorikpi.com}"
PI_APP_DIR="${PI_APP_DIR:-/home/jorikb/ideaprojects/my-app}"
REMOTE_ARCHIVE="/home/jorikb/my-app-next.tar.gz"
REMOTE_BUNDLE="/home/jorikb/my-app-source.bundle"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_DIR="$(mktemp -d -t my-app-deploy.XXXXXX)"
ARCHIVE="$TEMP_DIR/my-app-next.tar.gz"
BUNDLE="$TEMP_DIR/my-app-source.bundle"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Deployment stopped: commit your changes first."
    echo
    git status --short
    exit 1
fi

echo "Pushing committed source code..."
git push

echo "Building the website on the Mac..."
npm run build -- --webpack

echo "Packaging the completed Next.js build..."
tar \
  --exclude='.next/dev' \
  --exclude='.next/cache' \
  -czf "$ARCHIVE" .next
git bundle create "$BUNDLE" main

echo "Copying the source and build to the Raspberry Pi..."
scp "$ARCHIVE" "$BUNDLE" "$PI_HOST:/home/jorikb/"

echo "Installing and restarting the website on the Raspberry Pi..."
ssh "$PI_HOST" "PI_APP_DIR='$PI_APP_DIR' REMOTE_ARCHIVE='$REMOTE_ARCHIVE' REMOTE_BUNDLE='$REMOTE_BUNDLE' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "$PI_APP_DIR"

export NVM_DIR="$HOME/.nvm"

set +u
source "$NVM_DIR/nvm.sh"
set -u

nvm use --silent

OLD_COMMIT="$(git rev-parse HEAD)"
git fetch "$REMOTE_BUNDLE" main:refs/remotes/deploy/main
git merge --ff-only refs/remotes/deploy/main
NEW_COMMIT="$(git rev-parse HEAD)"

if ! git diff --quiet "$OLD_COMMIT" "$NEW_COMMIT" -- package.json package-lock.json; then
    echo "Dependencies changed; installing production dependencies..."
    pm2 stop rasp-site >/dev/null 2>&1 || true
    npm ci --omit=dev
fi

pm2 stop rasp-site >/dev/null 2>&1 || true

rm -rf .next
tar -xzf "$REMOTE_ARCHIVE"
test -f .next/BUILD_ID
rm -f "$REMOTE_ARCHIVE" "$REMOTE_BUNDLE"

if pm2 describe rasp-site >/dev/null 2>&1; then
    pm2 restart rasp-site --update-env
else
    pm2 start npm --name rasp-site -- start -- -H 127.0.0.1
fi

pm2 save
curl --fail --silent --show-error --retry 10 --retry-delay 1 \
    --retry-connrefused http://127.0.0.1:3000/ >/dev/null

echo "Raspberry Pi website is responding on port 3000."
REMOTE_SCRIPT

echo "Deployment complete: https://rasp.jorikpi.com"
