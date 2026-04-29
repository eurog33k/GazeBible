#!/usr/bin/env bash
# Deploy GazeBible frontend to production server.
#
# SETUP: Copy this file to deployfe.sh and fill in your server IP:
#   cp deployfrontend.sh deployfe.sh
#   # then edit deployfe.sh and replace YOUR_SERVER_IP
#
# deployfe.sh is gitignored (it contains your server IP).
# This template file is committed to the repo.
set -euo pipefail

SERVER_IP="YOUR_SERVER_IP"
SSH_KEY="$HOME/.ssh/id_rsa"
TARGET="root@${SERVER_IP}"
DEPLOY_DIR="/opt/gazebible"
REPO="$(cd "$(dirname "$0")" && pwd)"

# ── Build frontend ────────────────────────────────────────────────────────────

echo ">>> Building frontend..."
cd "${REPO}/gazebible"
npm run build

# ── Upload ────────────────────────────────────────────────────────────────────

echo ">>> Uploading frontend dist..."
rsync -avz \
  -e "ssh -i ${SSH_KEY}" \
  "${REPO}/gazebible/dist/" \
  "${TARGET}:${DEPLOY_DIR}/dist/"

echo ">>> Uploading user manual..."
rsync -avz \
  -e "ssh -i ${SSH_KEY}" \
  "${REPO}/html/" \
  "${TARGET}:${DEPLOY_DIR}/html/"

# ── Restart backend ───────────────────────────────────────────────────────────

echo ">>> Restarting backend on server..."
ssh -i "${SSH_KEY}" "${TARGET}" "pm2 restart gazebible"

echo ""
echo "Done."
