#!/bin/bash
# ============================================
# Lotus Academy - Frontend Deploy (Static Files)
# Upload tar.gz → extract to nginx dir
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_TAR="$PROJECT_ROOT/frontend-build.tar.gz"

if [ ! -f "$ENV_FILE" ]; then echo -e "\033[31mERROR: deploy.env not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_FILE"); set +a

if [ ! -f "$BUILD_TAR" ]; then echo -e "\033[31mERROR: $BUILD_TAR not found! Run frontend_build.sh first\033[0m"; exit 1; fi

SIZE=$(du -h "$BUILD_TAR" | cut -f1)
TOTAL_START=$SECONDS
echo -e "\033[32m=== Frontend Deploy ($SIZE) ===\033[0m"

# 1. Upload
echo -e "\033[36m1/2 Uploading...\033[0m"
STEP=$SECONDS
scp -P "$SSH_PORT" "$BUILD_TAR" "$SSH_HOST:$REMOTE_DIR/frontend-build.tar.gz"
echo -e "\033[90m    ⏱ upload: $((SECONDS - STEP))s\033[0m"

# 2. Extract with atomic switch (no Node.js needed)
echo -e "\033[36m2/2 Deploying static files...\033[0m"
STEP=$SECONDS
ssh -p "$SSH_PORT" "$SSH_HOST" "
    set -e
    cd $REMOTE_DIR
    mkdir -p frontend-new
    tar xzf frontend-build.tar.gz -C frontend-new
    rm frontend-build.tar.gz
    rm -rf frontend-old
    [ -d frontend ] && mv frontend frontend-old
    mv frontend-new frontend
    rm -rf frontend-old
    echo 'Done'
"
rm -f "$BUILD_TAR"
echo -e "\033[90m    ⏱ deploy: $((SECONDS - STEP))s\033[0m"

echo -e "\033[32m=== Deployed: https://$DOMAIN | total: $((SECONDS - TOTAL_START))s ===\033[0m"
echo -e "\033[90m  Static files at: $REMOTE_DIR/frontend\033[0m"
