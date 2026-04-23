#!/bin/bash
# ============================================
# Lotus Academy - Nginx Install
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"

if [ ! -f "$ENV_FILE" ]; then echo -e "\033[31mERROR: deploy.env not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_FILE"); set +a

SSH_CMD="ssh -p $SSH_PORT $SSH_HOST"

echo -e "\033[32m=== Nginx Install ===\033[0m"

echo -e "\033[36m1/2 Installing Nginx...\033[0m"
$SSH_CMD "apt-get update -qq && apt-get install -y -qq nginx > /dev/null && echo done"

echo -e "\033[36m2/2 Cleaning defaults...\033[0m"
$SSH_CMD "rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf 2>/dev/null; echo done"

echo -e "\033[32m=== Nginx installed ===\033[0m"
