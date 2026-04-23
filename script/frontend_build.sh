#!/bin/bash
# ============================================
# Lotus Academy - Frontend Build (Static Export)
# Compile → out/ → tar.gz (~2MB)
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BUILD_TAR="$PROJECT_ROOT/frontend-build.tar.gz"

if [ ! -f "$ENV_FILE" ]; then echo -e "\033[31mERROR: deploy.env not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_FILE"); set +a

ENV_PROD="$FRONTEND_DIR/.env.production"
if [ ! -f "$ENV_PROD" ]; then echo -e "\033[31mERROR: .env.production not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_PROD"); set +a

TOTAL_START=$SECONDS
echo -e "\033[32m=== Frontend Build (Static Export) ===\033[0m"

# 1. Build
echo -e "\033[36m1/2 npm run build...\033[0m"
STEP=$SECONDS
cd "$FRONTEND_DIR" && npm run build && cd "$PROJECT_ROOT"
echo -e "\033[90m    ⏱ build: $((SECONDS - STEP))s\033[0m"

# 2. Pack out/ directory
echo -e "\033[36m2/2 Packing tar.gz...\033[0m"
STEP=$SECONDS
tar czf "$BUILD_TAR" -C "$FRONTEND_DIR/out" .
SIZE=$(du -h "$BUILD_TAR" | cut -f1)
echo -e "\033[90m    ⏱ pack: $((SECONDS - STEP))s ($SIZE)\033[0m"

echo -e "\033[32m=== Build complete: $BUILD_TAR ($SIZE) | total: $((SECONDS - TOTAL_START))s ===\033[0m"
