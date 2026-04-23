#!/bin/bash
# ============================================
# Lotus Academy - Generate .env files (Bash)
# Auto-generates all keys including JWT, ANON_KEY, SERVICE_ROLE_KEY
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "\033[31mERROR: deploy.env not found!\033[0m"
    echo -e "\033[33mCopy deploy.env.example to deploy.env and configure it\033[0m"
    exit 1
fi

# Parse deploy.env
set -a; source <(sed 's///; s/^﻿//' "$ENV_FILE"); set +a

SSH_CMD="ssh -p $SSH_PORT $SSH_HOST"

echo -e "\033[32m=== Lotus Academy - Generate Env ===\033[0m"
echo ""

# ---- Utility Functions ----

random_password() {
    local len=${1:-32}
    tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c "$len"
}

random_hex() {
    local bytes=${1:-32}
    openssl rand -hex "$bytes"
}

base64url() {
    openssl base64 -A | tr '+/' '-_' | tr -d '='
}

hmac_sha256_base64url() {
    local msg="$1" secret="$2"
    printf '%s' "$msg" | openssl dgst -sha256 -hmac "$secret" -binary | base64url
}

generate_jwt() {
    local role="$1" secret="$2"
    local header='{"alg":"HS256","typ":"JWT"}'
    local iat=1704067200  # 2024-01-01
    local exp=1893456000  # 2030-01-01
    local payload="{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}"
    local header_b64=$(printf '%s' "$header" | base64url)
    local payload_b64=$(printf '%s' "$payload" | base64url)
    local signature=$(hmac_sha256_base64url "$header_b64.$payload_b64" "$secret")
    echo "$header_b64.$payload_b64.$signature"
}

# ---- Auto-generate all keys ----
POSTGRES_PASSWORD=$(random_password 24)
JWT_SECRET=$(random_password 48)
SECRET_KEY_BASE=$(random_hex 48)
ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")

echo -e "\033[90m  Generated PostgreSQL password\033[0m"
echo -e "\033[90m  Generated JWT secret\033[0m"
echo -e "\033[90m  Generated ANON_KEY\033[0m"
echo -e "\033[90m  Generated SERVICE_ROLE_KEY\033[0m"
echo ""

# ---- Interactive input (SMTP only) ----
echo -e "\033[36mSMTP Configuration (press Enter for defaults):\033[0m"
echo ""

read -rp "SMTP Host (default: smtp.163.com): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.163.com}

read -rp "SMTP Port (default: 25): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-25}

read -rp "SMTP User (email): " SMTP_USER
read -rp "SMTP Password: " SMTP_PASS
echo ""

echo -e "\033[36mGenerating...\033[0m"

# ---- Generate docker/.env ----
cat > "$PROJECT_ROOT/docker/.env" << EOF
# ============================================
# Lotus Academy - Production Env (auto-generated)
# Domain: $DOMAIN
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# Site
SITE_URL=https://$DOMAIN
API_EXTERNAL_URL=https://$DOMAIN/api
SUPABASE_PUBLIC_URL=https://$DOMAIN/api
NEXT_PUBLIC_SUPABASE_URL=https://$DOMAIN/api

# Nginx
NGINX_PORT=8080

# Studio
STUDIO_PORT=3002

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=3600

# Supabase API Keys (signed with JWT_SECRET)
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# Email
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
DISABLE_SIGNUP=false

# SMTP
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_SENDER_NAME=LotusAcademy

# Realtime
SECRET_KEY_BASE=$SECRET_KEY_BASE

# Misc
ADDITIONAL_REDIRECT_URLS=
IMGPROXY_ENABLE_WEBP_DETECTION=true
STUDIO_DEFAULT_ORGANIZATION=LotusAcademy
STUDIO_DEFAULT_PROJECT=lotus-academy
EOF
echo -e "\033[32m  OK: docker/.env\033[0m"

# ---- Generate frontend/.env.production ----
cat > "$PROJECT_ROOT/frontend/.env.production" << EOF
NEXT_PUBLIC_SUPABASE_URL=https://$DOMAIN/api
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EOF
echo -e "\033[32m  OK: frontend/.env.production\033[0m"

# ---- Upload to server ----
echo ""
read -rp "Upload .env to server? (y/N): " upload
if [ "$upload" = "y" ] || [ "$upload" = "Y" ]; then
    echo -e "\033[36mUploading...\033[0m"
    $SSH_CMD "mkdir -p $REMOTE_DIR/docker"
    scp -P "$SSH_PORT" "$PROJECT_ROOT/docker/.env" "$SSH_HOST:$REMOTE_DIR/docker/.env"
    echo -e "\033[32m  OK: uploaded to server\033[0m"
fi

echo ""
echo -e "\033[33m=== Keys Summary (save these!) ===\033[0m"
echo "  POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
echo "  JWT_SECRET:        $JWT_SECRET"
echo "  ANON_KEY:          $ANON_KEY"
echo "  SERVICE_ROLE_KEY:  $SERVICE_ROLE_KEY"
echo -e "\033[33m===================================\033[0m"
echo ""
echo -e "\033[36mFiles:\033[0m"
echo "  docker/.env              - Docker Compose"
echo "  frontend/.env.production - Frontend build"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo "  1. bash script/nginx_deploy.sh   - Deploy Nginx"
echo "  2. bash script/backend_online.sh - Deploy backend"
echo "  3. bash script/frontend_online.sh - Deploy frontend"
echo "  4. bash script/ssl_deploy.sh     - Setup HTTPS"
