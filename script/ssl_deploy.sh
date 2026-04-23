#!/bin/bash
# ============================================
# Lotus Academy - SSL Deploy (Bash)
# Certbot + Let's Encrypt HTTPS setup
# Prerequisite: nginx_deploy.sh completed and HTTP works
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "\033[31mERROR: deploy.env not found!\033[0m"
    echo -e "\033[33mCopy deploy.env.example to deploy.env and configure it\033[0m"
    exit 1
fi

set -a; source <(sed 's///; s/^﻿//' "$ENV_FILE"); set +a

SSH_CMD="ssh -p $SSH_PORT $SSH_HOST"

echo -e "\033[32m=== Lotus Academy - SSL Deploy ===\033[0m"
echo -e "\033[33m  Domain: $DOMAIN\033[0m"
echo ""

read -rp "Email for cert expiry notices (default: $SSL_EMAIL): " EMAIL
EMAIL=${EMAIL:-$SSL_EMAIL}

echo ""
echo -e "\033[36m1/3 Installing Certbot...\033[0m"
$SSH_CMD "apt-get install -y -qq certbot python3-certbot-nginx > /dev/null && echo done"

echo -e "\033[36m2/3 Requesting SSL certificate...\033[0m"
$SSH_CMD "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL"

echo -e "\033[36m3/3 Verifying certificate...\033[0m"
$SSH_CMD "certbot certificates 2>/dev/null | grep -A3 '$DOMAIN'"

echo ""
echo -e "\033[32m=== SSL deployed ===\033[0m"
echo -e "\033[33m  HTTPS: https://$DOMAIN\033[0m"
echo -e "\033[90m  Auto-renewal: enabled (certbot systemd timer)\033[0m"
