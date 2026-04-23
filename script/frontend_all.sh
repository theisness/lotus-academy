#!/bin/bash
# ============================================
# Lotus Academy - Frontend Build + Deploy (one-shot)
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL_START=$SECONDS

bash "$SCRIPT_DIR/frontend_build.sh"
bash "$SCRIPT_DIR/frontend_deploy.sh"

echo -e "\033[32m=== All done | total: $((SECONDS - TOTAL_START))s ===\033[0m"
