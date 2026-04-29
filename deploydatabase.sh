#!/usr/bin/env bash
# Upload the combined Bible database to the production server.
#
# Run this once after first setup, and again whenever translations are added.
# The database is built on your workstation first — see bible/README.md.
#
# SETUP: Copy this file to deploydb.sh and fill in your server IP:
#   cp deploydatabase.sh deploydb.sh
#   # then edit deploydb.sh and replace YOUR_SERVER_IP
#
# deploydb.sh is gitignored (it contains your server IP).
# This template file is committed to the repo.
set -euo pipefail

SERVER_IP="YOUR_SERVER_IP"
SSH_KEY="$HOME/.ssh/id_rsa"
TARGET="root@${SERVER_IP}"
DEPLOY_DIR="/opt/gazebible"
REPO="$(cd "$(dirname "$0")" && pwd)"

DB="${REPO}/bible/bibles_combined.sqlite"

if [ ! -f "${DB}" ]; then
  echo "ERROR: ${DB} not found."
  echo "Build it first: cd bible && python3 merge_bibles.py"
  exit 1
fi

echo ">>> Uploading bibles_combined.sqlite (~370 MB, this will take a while)..."
rsync -avz --progress \
  -e "ssh -i ${SSH_KEY}" \
  "${DB}" \
  "${TARGET}:${DEPLOY_DIR}/bibles_combined.sqlite"

echo ""
echo "Done."
