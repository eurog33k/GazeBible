#!/usr/bin/env bash
# Deploy GazeBible backend to production server.
#
# SETUP: Copy this file to deploybe.sh and fill in your server IP:
#   cp deploybackend.sh deploybe.sh
#   # then edit deploybe.sh and replace YOUR_SERVER_IP
#
# deploybe.sh is gitignored (it contains your server IP).
# This template file is committed to the repo.
set -euo pipefail

SERVER_IP="YOUR_SERVER_IP"
SSH_KEY="$HOME/.ssh/id_rsa"
TARGET="root@${SERVER_IP}"
DEPLOY_DIR="/opt/gazebible"
REPO="$(cd "$(dirname "$0")" && pwd)"

# ── Upload backend source ─────────────────────────────────────────────────────

echo ">>> Uploading backend..."
rsync -avz \
  -e "ssh -i ${SSH_KEY}" \
  --exclude node_modules \
  --exclude dist \
  "${REPO}/bible-backend/" \
  "${TARGET}:${DEPLOY_DIR}/backend/"

# ── Install dependencies on server ───────────────────────────────────────────

echo ">>> Installing dependencies on server..."
ssh -i "${SSH_KEY}" "${TARGET}" "cd ${DEPLOY_DIR}/backend && npm install"

# ── Start or restart backend ─────────────────────────────────────────────────

echo ">>> Starting/restarting backend on server..."
ssh -i "${SSH_KEY}" "${TARGET}" "
  cd ${DEPLOY_DIR}/backend
  if pm2 describe gazebible > /dev/null 2>&1; then
    pm2 restart gazebible
  else
    pm2 start 'npm run dev' --name gazebible
  fi
  pm2 save
  pm2 startup systemd -u root --hp /root
"

echo ""
echo "Done. App running at http://${SERVER_IP}:3001"
