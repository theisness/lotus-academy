#!/bin/bash
# ============================================
# Lotus Academy - Nginx Deploy Config
# Upload nginx-lotus.conf + reload
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"

if [ ! -f "$ENV_FILE" ]; then echo -e "\033[31mERROR: deploy.env not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_FILE"); set +a

CONF_FILE="$SCRIPT_DIR/nginx-lotus.conf"

echo -e "\033[32m=== Nginx Deploy Config ===\033[0m"

echo -e "\033[36m1/2 Uploading nginx-lotus.conf...\033[0m"
scp -P "$SSH_PORT" "$CONF_FILE" "$SSH_HOST:/etc/nginx/conf.d/$DOMAIN.conf"

echo -e "\033[36m2/2 Testing & reloading...\033[0m"
ssh -p "$SSH_PORT" "$SSH_HOST" "nginx -t && systemctl reload nginx && echo 'Nginx reloaded'"

echo -e "\033[32m=== Config deployed ===\033[0m"
