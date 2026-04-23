#!/bin/bash
# ============================================
# Lotus Academy - Backend Deploy (Bash)
# Upload backend + docker files and start services
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

set -a; source <(sed 's///; s/^﻿//' "$ENV_FILE"); set +a

SSH_CMD="ssh -p $SSH_PORT $SSH_HOST"

echo -e "\033[32m=== Lotus Academy - Backend Deploy ===\033[0m"
echo ""

# 1. Create remote dirs
echo -e "\033[36m1/5 Creating remote directories...\033[0m"
$SSH_CMD "mkdir -p $REMOTE_DIR/backend/supabase/migrations $REMOTE_DIR/docker $REMOTE_DIR/script"

# 2. Upload backend files
echo -e "\033[36m2/5 Uploading backend files...\033[0m"
scp -P "$SSH_PORT" "$PROJECT_ROOT/backend/kong.yml" "$SSH_HOST:$REMOTE_DIR/backend/"
scp -P "$SSH_PORT" "$PROJECT_ROOT/backend/docker-compose.yml" "$SSH_HOST:$REMOTE_DIR/backend/"

# Upload migrations
for f in "$PROJECT_ROOT"/backend/supabase/migrations/*.sql; do
    [ -f "$f" ] && scp -P "$SSH_PORT" "$f" "$SSH_HOST:$REMOTE_DIR/backend/supabase/migrations/"
done

# Upload SQL fix scripts
for f in "$PROJECT_ROOT"/backend/fix_*.sql; do
    [ -f "$f" ] && scp -P "$SSH_PORT" "$f" "$SSH_HOST:$REMOTE_DIR/backend/"
done

# 3. Upload docker compose
echo -e "\033[36m3/5 Uploading Docker files...\033[0m"
scp -P "$SSH_PORT" "$PROJECT_ROOT/docker/docker-compose.yml" "$SSH_HOST:$REMOTE_DIR/docker/"
scp -P "$SSH_PORT" "$PROJECT_ROOT/docker/Dockerfile.frontend" "$SSH_HOST:$REMOTE_DIR/docker/"

# 4. Upload scripts
echo -e "\033[36m4/5 Uploading scripts...\033[0m"
scp -P "$SSH_PORT" "$PROJECT_ROOT/script/deploy.sh" "$SSH_HOST:$REMOTE_DIR/script/" 2>/dev/null || true
scp -P "$SSH_PORT" "$PROJECT_ROOT/script/nginx-academy.conf" "$SSH_HOST:$REMOTE_DIR/script/" 2>/dev/null || true

# 5. Start backend services
echo -e "\033[36m5/5 Starting backend services...\033[0m"
$SSH_CMD "cd $REMOTE_DIR && docker compose -f docker/docker-compose.yml --env-file docker/.env up -d db auth rest realtime storage imgproxy kong meta studio"

echo ""
echo -e "\033[32m=== Backend deployed ===\033[0m"
echo -e "\033[33m  Note: run generate_env.sh first if .env is missing on server\033[0m"
